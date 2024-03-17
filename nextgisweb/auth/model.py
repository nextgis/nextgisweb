from collections import namedtuple
from functools import cached_property, lru_cache
from itertools import chain
from typing import Callable, ClassVar, FrozenSet, Iterable, Mapping, Union, overload

import sqlalchemy as sa
import sqlalchemy.orm as orm
from passlib.hash import sha256_crypt
from sqlalchemy.dialects.postgresql import ARRAY, JSONB
from zope.event import notify
from zope.event.classhandler import handler

from nextgisweb.env import Base, gettext
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

    id = sa.Column(sa.Integer, sa.Sequence("principal_seq"), primary_key=True)
    cls = sa.Column(sa.Unicode(1), nullable=False)
    system = sa.Column(sa.Boolean, nullable=False, default=False)
    display_name = sa.Column(sa.Unicode, nullable=False)
    description = sa.Column(sa.Unicode)
    permissions = sa.Column(ARRAY(sa.Unicode, as_tuple=True), nullable=False, default=tuple())

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
    def display_name_i18n(self) -> Union[TrStr, str]:
        if self.system and (value := self.system_display_name.get(self.keyname)):
            return value
        return self.display_name


class User(Principal):
    __tablename__ = "auth_user"

    principal_id = sa.Column(
        sa.Integer, sa.Sequence("principal_seq"), sa.ForeignKey(Principal.id), primary_key=True
    )
    keyname = sa.Column(sa.Unicode, unique=True)
    superuser = sa.Column(sa.Boolean, nullable=False, default=False)
    disabled = sa.Column(sa.Boolean, nullable=False, default=False)
    password_hash = sa.Column(sa.Unicode)
    oauth_subject = sa.Column(sa.Unicode, unique=True)
    oauth_tstamp = sa.Column(sa.DateTime)
    alink_token = sa.Column(sa.Unicode, unique=True)
    last_activity = sa.Column(sa.DateTime)
    language = sa.Column(sa.Unicode)

    system_display_name = {
        "guest": gettext("Guest"),
        "everyone": gettext("Everyone"),
        "authenticated": gettext("Authenticated"),
        "owner": gettext("Owner"),
    }

    __mapper_args__ = dict(polymorphic_identity="U")

    def __init__(self, password=None, **kwargs):
        super().__init__(**kwargs)
        if password:
            self.password = password

    def __str__(self):
        return self.display_name

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
        return cls.filter(sa.func.lower(User.keyname) == keyname.lower()).one()

    @cached_property
    def effective_permissions(self) -> FrozenSet[Permission]:
        registry = Permission.registry
        return frozenset(
            registry[identity]
            for identity in chain(
                self.permissions,
                *(group.permissions for group in self.member_of),
            )
        )

    @overload
    def has_permission(self, perm: Permission) -> bool:
        ...

    @overload
    def has_permission(self, fn: Callable[[Iterable[bool]], bool], *perms: Permission) -> bool:
        ...

    def has_permission(self, *args) -> bool:
        if self.superuser or self.is_administrator:
            return True
        if len(effective_permissions := self.effective_permissions) == 0:
            return False
        fn, *perms = (all, *args) if len(args) == 1 else args
        return fn(p in effective_permissions for p in perms)

    @overload
    def require_permission(self, perm: Permission):
        ...

    @overload
    def require_permission(self, fn: Callable[[Iterable[bool]], bool], *perms: Permission):
        ...

    def require_permission(self, *args):
        if not self.has_permission(*args):
            raise ForbiddenError

    __table_args__ = (
        sa.Index("auth_user_lower_keyname_idx", sa.func.lower(keyname), unique=True),
    )


class Group(Principal):
    __tablename__ = "auth_group"

    principal_id = sa.Column(
        sa.Integer, sa.Sequence("principal_seq"), sa.ForeignKey(Principal.id), primary_key=True
    )
    keyname = sa.Column(sa.Unicode, unique=True)
    register = sa.Column(sa.Boolean, nullable=False, default=False)
    oauth_mapping = sa.Column(sa.Boolean, nullable=False, default=False)

    system_display_name = {
        "administrators": gettext("Administrators"),
    }

    members = orm.relationship(
        User,
        secondary=tab_group_user,
        cascade_backrefs=False,
        backref=orm.backref("member_of"),
    )

    __mapper_args__ = dict(polymorphic_identity="G")

    def __str__(self):
        return self.display_name

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

    id = sa.Column(sa.Unicode, primary_key=True)
    exp = sa.Column(sa.BigInteger, nullable=False)
    sub = sa.Column(sa.Unicode, nullable=False)
    data = sa.Column(JSONB, nullable=False)


class OAuthPToken(Base):
    __tablename__ = "auth_oauth_ptoken"

    id = sa.Column(sa.Unicode, primary_key=True)
    tstamp = sa.Column(sa.BigInteger, nullable=False)
    user_id = sa.Column(sa.ForeignKey(User.id, ondelete="CASCADE"), nullable=False)
    access_token = sa.Column(sa.Unicode, nullable=False)
    access_exp = sa.Column(sa.BigInteger, nullable=False)
    refresh_token = sa.Column(sa.Unicode, nullable=False)
    refresh_exp = sa.Column(sa.BigInteger, nullable=False)

    user = orm.relationship(User)


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
