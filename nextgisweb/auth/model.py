from collections import namedtuple
from collections.abc import Mapping
from datetime import datetime
from functools import cached_property, lru_cache
from itertools import chain
from secrets import token_hex, token_urlsafe
from typing import TYPE_CHECKING, Callable, ClassVar, Iterable, overload

import sqlalchemy as sa
import sqlalchemy.dialects.postgresql as sa_pg
import sqlalchemy.orm as orm
from passlib.hash import sha256_crypt
from sqlalchemy.orm import Mapped, mapped_column
from zope.event import notify
from zope.event.classhandler import handler

from nextgisweb.env import Base, DBSession, gettext
from nextgisweb.lib.i18n import TrStr

from nextgisweb.core.exception import ForbiddenError

from .permission import Permission

tab_group_user = sa.Table(
    "auth_group_user",
    Base.metadata,
    sa.Column("group_id", sa.Integer, sa.ForeignKey("auth_group.principal_id"), primary_key=True),
    sa.Column("user_id", sa.Integer, sa.ForeignKey("auth_user.principal_id"), primary_key=True),
)


OnFindReferencesData = namedtuple("OnFindReferencesData", ["cls", "id", "autoremove"])


class Principal(Base):
    __tablename__ = "auth_principal"

    id: Mapped[int] = mapped_column(sa.Integer, sa.Sequence("principal_seq"), primary_key=True)
    cls: Mapped[str] = mapped_column(sa.Unicode(1))
    system: Mapped[bool] = mapped_column(sa.Boolean, default=False)
    display_name: Mapped[str] = mapped_column(sa.Unicode)
    description: Mapped[str | None] = mapped_column(sa.Unicode)
    permissions: Mapped[tuple] = mapped_column(
        sa_pg.ARRAY(sa.Unicode, as_tuple=True),
        default=tuple(),
    )

    system_display_name: ClassVar[Mapping[str, TrStr]]

    __table_args__ = (
        sa.Index(
            "auth_principal_cls_lower_display_name_idx",
            cls,
            sa.func.lower(display_name),
            unique=True,
        ),
    )

    class on_find_references:
        def __init__(self, principal):
            self.principal = principal
            self.data = []

        def notify(self):
            notify(self)

        @classmethod
        def handler(cls, fun):
            @handler(cls)
            def _handler(event):
                fun(event)

    __mapper_args__ = dict(polymorphic_on=cls, with_polymorphic="*")

    @property
    def display_name_i18n(self) -> TrStr | str:
        if self.system and (value := self.system_display_name.get(self.keyname)):
            return value
        return self.display_name


class User(Principal):
    __tablename__ = "auth_user"

    principal_id: Mapped[int] = mapped_column(
        sa.Integer,
        sa.Sequence("principal_seq"),
        sa.ForeignKey(Principal.id),
        primary_key=True,
    )
    keyname: Mapped[str | None] = mapped_column(sa.Unicode, unique=True)
    superuser: Mapped[bool] = mapped_column(sa.Boolean, default=False)
    disabled: Mapped[bool] = mapped_column(sa.Boolean, default=False)
    password_hash: Mapped[str | None] = mapped_column(sa.Unicode)
    oauth_subject: Mapped[str | None] = mapped_column(sa.Unicode, unique=True)
    oauth_tstamp: Mapped[datetime | None] = mapped_column(sa.DateTime)
    alink_token: Mapped[str | None] = mapped_column(sa.Unicode, unique=True)
    last_activity: Mapped[datetime | None] = mapped_column(sa.DateTime)
    language: Mapped[str | None] = mapped_column(sa.Unicode)

    system_display_name = {
        "guest": gettext("Guest"),
        "everyone": gettext("Everyone"),
        "authenticated": gettext("Authenticated"),
        "owner": gettext("Owner"),
    }

    __mapper_args__ = dict(polymorphic_identity="U")

    __table_args__ = (
        sa.Index("auth_user_lower_keyname_idx", sa.func.lower(keyname), unique=True),
    )

    member_of: Mapped[list["Group"]] = orm.relationship(
        secondary=tab_group_user,
        back_populates="members",
    )

    def __init__(self, password=None, **kwargs):
        super().__init__(**kwargs)
        if password:
            self.password = password

    def __str__(self):
        return self.display_name

    @classmethod
    def test_instance(cls, **kwargs):
        """Create and return a test user with randomized attributes"""

        if TYPE_CHECKING:

            class UserWithPassword(cls):
                password_plaintext: str
        else:
            UserWithPassword = cls

        rnd = token_hex(8)
        obj = UserWithPassword(keyname=f"user_{rnd}", display_name=f"User {rnd}", **kwargs)
        obj.password = obj.password_plaintext = token_urlsafe()
        return obj

    def compare(self, other):
        """Compare two users regarding special users"""

        # If neither user is special use regular comparison
        if not self.system and not other.system:
            return self.principal_id == other.principal_id

        elif self.system:
            a, b = self, other

        elif other.system:
            a, b = other, self

        # Now a - special user, b - common

        if a.keyname == "everyone":
            return True

        elif a.keyname == "authenticated":
            return b.keyname != "guest"

        elif b.keyname == "authenticated":
            return a.keyname != "guest"

        else:
            return a.principal_id == b.principal_id and a.principal_id is not None

    @property
    def password(self):
        return PasswordHashValue(self.password_hash) if self.password_hash is not None else None

    @password.setter
    def password(self, value):
        self.password_hash = sha256_crypt.hash(value) if value is not None else None

    @classmethod
    def by_keyname(cls, keyname):
        with DBSession.no_autoflush:
            return cls.filter(sa.func.lower(User.keyname) == keyname.lower()).one()

    @cached_property
    def effective_permissions(self) -> frozenset[Permission]:
        registry = Permission.registry
        return frozenset(
            registry[identity]
            for identity in chain(
                self.permissions,
                *(group.permissions for group in self.member_of),
            )
        )

    @overload
    def has_permission(self, perm: Permission) -> bool: ...

    @overload
    def has_permission(self, fn: Callable[[Iterable[bool]], bool], *perms: Permission) -> bool: ...

    def has_permission(self, *args) -> bool:
        if self.superuser or self.is_administrator:
            return True
        if len(effective_permissions := self.effective_permissions) == 0:
            return False
        fn, *perms = (all, *args) if len(args) == 1 else args
        return fn(p in effective_permissions for p in perms)

    @overload
    def require_permission(self, perm: Permission): ...

    @overload
    def require_permission(self, fn: Callable[[Iterable[bool]], bool], *perms: Permission): ...

    def require_permission(self, *args):
        if not self.has_permission(*args):
            raise ForbiddenError


class Group(Principal):
    __tablename__ = "auth_group"

    principal_id: Mapped[int] = mapped_column(
        sa.Integer, sa.Sequence("principal_seq"), sa.ForeignKey(Principal.id), primary_key=True
    )
    keyname: Mapped[str | None] = mapped_column(sa.Unicode, unique=True)
    register: Mapped[bool] = mapped_column(sa.Boolean, default=False)
    oauth_mapping: Mapped[bool] = mapped_column(sa.Boolean, default=False)

    system_display_name = {
        "administrators": gettext("Administrators"),
    }

    members: Mapped[list[User]] = orm.relationship(
        secondary=tab_group_user,
        back_populates="member_of",
    )

    __mapper_args__ = dict(polymorphic_identity="G")

    def __str__(self):
        return self.display_name

    @classmethod
    def test_instance(cls, **kwargs):
        """Create and return a test group with randomized attributes"""

        rnd = token_hex(8)
        obj = cls(keyname=f"group_{rnd}", display_name=f"Group {rnd}", **kwargs)
        return obj

    def is_member(self, user):
        if self.keyname == "authorized":
            return user is not None and user.keyname != "guest"

        elif self.keyname == "everyone":
            return user is not None

        else:
            return user in self.members


auth_group_administrators = Group.__table__.alias("auth_group_administrators")
User.is_administrator = orm.column_property(
    sa.select(1)
    .select_from(
        tab_group_user.join(
            auth_group_administrators,
            sa.and_(
                auth_group_administrators.c.principal_id == tab_group_user.c.group_id,
                auth_group_administrators.c.keyname == "administrators",
            ),
        )
    )
    .where(tab_group_user.c.user_id == User.principal_id)
    .exists()
    .label("is_administrator"),
    deferred=True,
)


class OAuthAToken(Base):
    __tablename__ = "auth_oauth_atoken"

    id: Mapped[str] = mapped_column(sa.Unicode, primary_key=True)
    exp: Mapped[int] = mapped_column(sa.BigInteger)
    sub: Mapped[str] = mapped_column(sa.Unicode)
    data: Mapped[dict] = mapped_column(sa_pg.JSONB)


class OAuthPToken(Base):
    __tablename__ = "auth_oauth_ptoken"

    id: Mapped[str] = mapped_column(sa.Unicode, primary_key=True)
    tstamp: Mapped[int] = mapped_column(sa.BigInteger)
    user_id: Mapped[int] = mapped_column(sa.ForeignKey(User.id, ondelete="CASCADE"))
    access_token: Mapped[str] = mapped_column(sa.Unicode)
    access_exp: Mapped[int] = mapped_column(sa.BigInteger)
    refresh_token: Mapped[str] = mapped_column(sa.Unicode)
    refresh_exp: Mapped[int] = mapped_column(sa.BigInteger)

    user: Mapped[User] = orm.relationship()


@lru_cache(maxsize=256)
def _password_hash_cache(a, b):
    result = sha256_crypt.verify(a, b)
    if not result:
        # Prevent caching with ValueError
        raise ValueError()
    return result


class PasswordHashValue:
    """Automatic password hashes comparison class"""

    def __init__(self, value):
        self.value = value

    def __eq__(self, other):
        if self.value is None:
            return False
        elif isinstance(other, str):
            try:
                return _password_hash_cache(other, self.value)
            except ValueError:
                # Cache prevention with ValueError
                return False
        else:
            raise NotImplementedError()
