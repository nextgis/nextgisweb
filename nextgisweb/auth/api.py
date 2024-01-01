from datetime import datetime
from typing import List, Optional, TypeVar, Union

import sqlalchemy as sa
from msgspec import UNSET, Meta, Struct, UnsetType
from pyramid.httpexceptions import HTTPForbidden, HTTPUnauthorized
from pyramid.interfaces import ISecurityPolicy
from pyramid.security import forget
from sqlalchemy.orm import aliased, undefer
from typing_extensions import Annotated

from nextgisweb.env import DBSession, gettext, inject
from nextgisweb.lib.apitype import DEF, OP, REQ, RO, AsJSON, Derived, flag, omit, struct_items

from nextgisweb.core.exception import ValidationError
from nextgisweb.pyramid import JSONType
from nextgisweb.pyramid.util import gensecret

from .component import AuthComponent
from .model import Group, Principal, User

T = TypeVar("T")
BRIEF = flag("Brief")
DEF_NB = DEF[Annotated[T, omit(BRIEF)]]
RO_NB = RO[Annotated[T, omit(BRIEF)]]

Language = Annotated[str, Meta(pattern=r"^[a-z]{2,3}(\-[a-z]{2,3})?$")]
Keyname = Annotated[str, Meta(min_length=1, pattern=r"^[A-Za-z][A-Za-z0-9_\-]*$")]
DisplayName = Annotated[str, Meta(min_length=1)]


def serialize_principal(src, cls):
    attrs = dict()
    for k in cls.__struct_fields__:
        if k in ("members", "member_of"):
            attrs[k] = [m.id for m in getattr(src, k)]
        elif k == "password":
            attrs[k] = src.password_hash is not None
        elif k == "alink":
            attrs[k] = src.alink_token
        else:
            attrs[k] = getattr(src, k)
    return cls(**attrs)


class SystemPrincipalAttributeReadOnly(ValidationError):
    def __init__(self, attr):
        m = gettext("The '%s' attribute of the system principal can't be changed.")
        super().__init__(message=m % attr)


class PrincipalNotUnique(ValidationError):
    def __init__(self, attr, value):
        if attr == "keyname":
            message = gettext("Principal '%s' already exists.") % value
        elif attr == "display_name":
            message = gettext("Principal with full name '%s' already exists.") % value
        else:
            raise ValueError(f"Invalid attribute: {attr}")
        super().__init__(message=message)


def validate_keyname(obj, keyname):
    principal_cls = type(obj)

    query = principal_cls.filter(sa.func.lower(principal_cls.keyname) == keyname.lower())
    if obj.id is not None:
        query = query.filter(principal_cls.id != obj.id)

    if DBSession.query(query.exists()).scalar():
        raise PrincipalNotUnique("keyname", keyname)


def validate_display_name(obj, display_name):
    query = Principal.filter(
        Principal.cls == obj.cls, sa.func.lower(Principal.display_name) == display_name.lower()
    )
    if obj.id is not None:
        query = query.filter(Principal.id != obj.id)

    is_unique = not DBSession.query(query.exists()).scalar()
    if not is_unique:
        raise PrincipalNotUnique("display_name", display_name)


@inject()
def deserialize_principal(src, obj, *, create: bool, auth: AuthComponent):
    updated = set()

    is_group = isinstance(obj, Group)
    is_user = isinstance(obj, User)

    with DBSession.no_autoflush:
        for k, v in struct_items(src):
            attr = k
            if k == "alink":
                attr = "alink_token"

            if k == "members" and set(m.id for m in obj.members) == set(v):
                continue
            elif k == "member_of" and set(m.id for m in obj.member_of) == set(v):
                continue
            elif k == "password" and isinstance(v, bool):
                phash = obj.password_hash
                if v and phash is None:
                    raise ValidationError(message=gettext("Password is not set."))
                if (v and phash) or (not v and not phash):
                    continue
            elif getattr(obj, attr) == v:
                continue

            if (obj.system is True) and (
                (is_group and k not in ("register", "members", "oauth_mapping"))
                or (is_user and (k != "member_of" or obj.keyname != "guest"))
            ):
                raise SystemPrincipalAttributeReadOnly(k)

            if k == "keyname":
                validate_keyname(obj, v)
            elif k == "display_name":
                validate_display_name(obj, v)
            elif k == "members":
                validate_members(obj, v)
                v = [User.filter_by(id=id).one() for id in v]
            elif k == "member_of":
                v = [Group.filter_by(id=id).one() for id in v]
            elif k == "password" and v is False:
                v = None
            elif k == "alink":
                v = gensecret(32) if v else None

            setattr(obj, attr, v)
            updated.add(k)

    if create:
        obj.persist()
        DBSession.flush()

    if is_user and not obj.disabled and (create or "disabled" in updated):
        auth.check_user_limit(obj.id)

    return updated


class UserRef(Struct, kw_only=True):
    id: int


class _User(Struct, kw_only=True):
    id: RO[int]
    system: RO[bool]
    keyname: REQ[Keyname]
    display_name: REQ[DisplayName]
    description: DEF_NB[Optional[str]]
    superuser: RO_NB[bool]
    disabled: DEF[bool]
    password: DEF[Union[bool, str]]
    last_activity: RO[Optional[datetime]]
    language: DEF_NB[Optional[Language]]
    oauth_subject: RO[str]
    oauth_tstamp: RO_NB[Optional[datetime]]
    alink: DEF_NB[Union[bool, str]]
    member_of: DEF_NB[List[int]]
    is_administrator: RO[bool]


UserCreate = Derived[_User, OP.CREATE]
UserRead = Derived[_User, OP.READ]
UserUpdate = Derived[_User, OP.UPDATE]
UserReadBrief = Derived[_User, OP.READ, BRIEF]


def user_cget(request, *, brief: bool = False) -> AsJSON[List[UserRead]]:
    """Read users

    :param brief: Return limited set of attributes
    :returns: Array of user objects"""
    brief or request.require_administrator()  # pyright: ignore[reportUnusedExpression]

    q = User.query().options(undefer(User.is_administrator))
    if request.authenticated_userid is None:
        q = q.filter_by(system=True)

    cls = UserReadBrief if brief else UserRead
    return [serialize_principal(o, cls) for o in q]


def user_cpost(request, *, body: UserCreate) -> UserRef:
    """Create user

    :returns: User reference"""
    request.require_administrator()

    obj = User(system=False)
    deserialize_principal(body, obj, create=True)
    return UserRef(id=obj.id)


def user_iget(request) -> UserRead:
    """Read user

    :returns: User object"""
    request.require_administrator()

    q = User.filter_by(id=int(request.matchdict["id"]))
    q = q.options(undefer(User.is_administrator))

    return serialize_principal(q.one(), UserRead)


def user_iput(request, *, body: UserUpdate) -> UserRef:
    """Update user

    :returns: User reference"""
    request.require_administrator()

    obj = User.filter_by(id=int(request.matchdict["id"])).one()
    updated = deserialize_principal(body, obj, create=False)

    if obj.id != request.authenticated_userid and ({"keyname", "password", "alink"} & updated):
        auth_policy = request.registry.getUtility(ISecurityPolicy)
        auth_policy.forget_user(obj.id, request)

    if {"member_of", "disabled"} & updated:
        check_last_administrator()

    return UserRef(id=obj.id)


def user_idelete(request) -> JSONType:
    """Delete user"""
    request.require_administrator()

    obj = User.filter_by(id=int(request.matchdict["id"])).one()
    check_principal_delete(obj)
    DBSession.delete(obj)

    check_last_administrator()

    return None


class GroupRef(Struct, kw_only=True):
    id: int


class _Group(Struct, kw_only=True):
    id: RO[int]
    system: RO[bool]
    keyname: REQ[Keyname]
    display_name: REQ[DisplayName]
    description: DEF_NB[Optional[str]]
    register: DEF_NB[bool]
    oauth_mapping: DEF_NB[bool]
    members: DEF_NB[List[int]]


GroupCreate = Derived[_Group, OP.CREATE]
GroupRead = Derived[_Group, OP.READ]
GroupUpdate = Derived[_Group, OP.UPDATE]
GroupReadBrief = Derived[_Group, OP.READ, BRIEF]


def group_cget(request, *, brief: bool = False) -> AsJSON[List[_Group]]:
    """Read groups

    :param brief: Return limited set of attributes
    :returns: Array of group objects"""
    brief or request.require_administrator()  # pyright: ignore[reportUnusedExpression]

    q = Group.query()
    if request.authenticated_userid is None:
        q = q.filter_by(system=True)

    cls = GroupReadBrief if brief else GroupRead
    result = [serialize_principal(o, cls) for o in q]

    return result


def group_cpost(request, *, body: GroupCreate) -> GroupRef:
    """Create group

    :returns: Group reference"""
    request.require_administrator()

    obj = Group(system=False)
    deserialize_principal(body, obj, create=True)

    return GroupRef(id=obj.id)


def group_iget(request) -> GroupRead:
    """Read group

    :returns: Group object"""
    request.require_administrator()
    obj = Group.filter_by(id=int(request.matchdict["id"])).one()
    return serialize_principal(obj, GroupRead)


def group_iput(request, *, body: GroupUpdate) -> GroupRef:
    """Update group

    :returns: Group reference"""
    request.require_administrator()

    obj = Group.filter_by(id=int(request.matchdict["id"])).one()
    updated = deserialize_principal(body, obj, create=False)
    if {"members"} & updated:
        check_last_administrator()

    return GroupRef(id=obj.id)


def group_idelete(request) -> JSONType:
    """Delete group"""
    request.require_administrator()

    obj = Group.filter_by(id=int(request.matchdict["id"])).one()
    check_principal_delete(obj)
    DBSession.delete(obj)

    return None


class Profile(Struct, kw_only=True):
    oauth_subject: RO[Optional[str]]
    language: DEF[Optional[Language]]


ProfileRead = Derived[Profile, OP.READ]
ProfileUpdate = Derived[Profile, OP.UPDATE]


def profile_get(request) -> AsJSON[ProfileRead]:
    """Read profile of the current user

    :returns: User profile"""
    if request.user.keyname == "guest":
        return HTTPUnauthorized()

    return serialize_principal(request.user, ProfileRead)


def profile_put(request, body: ProfileUpdate) -> JSONType:
    """Update profile of the current user"""
    if request.user.keyname == "guest":
        return HTTPUnauthorized()

    deserialize_principal(body, request.user, create=False)

    return None


class CurrentUser(Struct):
    id: int
    keyname: Keyname
    display_name: DisplayName
    language: Language
    auth_medium: Optional[str]
    auth_provider: Optional[str]


def current_user(request) -> CurrentUser:
    """Read current user info

    :returns: User info"""
    result = CurrentUser(
        id=request.user.id,
        keyname=request.user.keyname,
        display_name=request.user.display_name,
        language=request.locale_name,
        auth_medium=None,
        auth_provider=None,
    )

    if aresult := request.environ.get("auth.result"):
        if val := aresult.med:
            result.auth_medium = val
        if val := aresult.prv:
            result.auth_provider = val

    return result


class RegisterBody(Struct, kw_only=True):
    keyname: REQ[Keyname]
    display_name: REQ[str]
    password: REQ[str]


def register(request, *, body: RegisterBody) -> UserRef:
    """Self-register user

    :returns: User reference"""
    if not request.env.auth.options["register"]:
        raise HTTPForbidden(explanation="Anonymous registration is not allowed!")

    obj = User(system=False)
    obj.member_of = list(Group.filter_by(register=True))
    deserialize_principal(body, obj, create=True)

    return UserRef(id=obj.id)


class LoginResponse(Struct, kw_only=True):
    id: int
    keyname: Keyname
    display_name: DisplayName
    home_url: Union[str, UnsetType] = UNSET


def login(request) -> LoginResponse:
    """Log in into session

    Parameters `login` and `password` can be passed in a JSON encoded body or as
    POST parameters (`application/x-www-form-urlencoded`)."""
    if len(request.POST) > 0:
        login = request.POST.get("login")
        password = request.POST.get("password")
    else:
        json_body = request.json_body
        if not isinstance(json_body, dict):
            raise ValidationError()
        login = json_body.get("login")
        password = json_body.get("password")

    if not isinstance(login, str) or not isinstance(password, str):
        raise ValidationError()

    policy = request.registry.getUtility(ISecurityPolicy)
    user, headers, event = policy.login(login, password, request=request)
    request.response.headerlist.extend(headers)

    result = LoginResponse(id=user.id, keyname=user.keyname, display_name=user.display_name)

    if event.next_url:
        result.home_url = event.next_url

    return result


def logout(request) -> JSONType:
    """Log out and close session"""
    headers = forget(request)
    request.response.headerlist.extend(headers)
    return dict()


def setup_pyramid(comp, config):
    config.add_route(
        "auth.user.collection", "/api/component/auth/user/", get=user_cget, post=user_cpost
    )

    config.add_route(
        "auth.user.item",
        "/api/component/auth/user/{id:uint}",
        get=user_iget,
        put=user_iput,
        delete=user_idelete,
    )

    config.add_route(
        "auth.profile", "/api/component/auth/profile", get=profile_get, put=profile_put
    )

    config.add_route(
        "auth.group.collection", "/api/component/auth/group/", get=group_cget, post=group_cpost
    )

    config.add_route(
        "auth.group.item",
        "/api/component/auth/group/{id:uint}",
        get=group_iget,
        put=group_iput,
        delete=group_idelete,
    )

    config.add_route("auth.current_user", "/api/component/auth/current_user", get=current_user)

    config.add_route("auth.register", "/api/component/auth/register", post=register)

    config.add_route("auth.login_cookies", "/api/component/auth/login", post=login)

    config.add_route("auth.logout_cookies", "/api/component/auth/logout", post=logout)


def validate_members(obj, members):
    user = User.filter(
        User.system,
        User.keyname != "guest",
        User.id.in_(members),
    ).first()
    if user is not None:
        m = gettext("User '%s' can't be a member of a group.")
        raise ValidationError(message=m % user.display_name)


def check_principal_delete(obj):
    if obj.system:
        raise ValidationError(message=gettext("System principals can't be deleted."))
    check_principal_references(obj)


def check_principal_references(obj):
    event = Principal.on_find_references(obj)
    event.notify()

    references_data = []
    for cls, _id, autoremove in event.data:
        if not autoremove:
            references_data.append((cls, _id))

    if len(references_data) > 0:
        raise ValidationError(
            message=gettext("User is referenced with resources")
            if isinstance(obj, User)
            else gettext("Group is referenced with resources"),
            data=dict(references_data=references_data),
        )


class AdministratorRequired(ValidationError):
    title = gettext("Administrator required")
    message = gettext("The 'administrators' group must have at least one enabled member.")


def check_last_administrator():
    member = aliased(User, flat=True)
    query = (
        DBSession.query(Group)
        .filter_by(keyname="administrators")
        .join(Group.members.of_type(member))
        .filter_by(disabled=False)
        .limit(1)
    )
    if query.count() == 0:
        raise AdministratorRequired()
