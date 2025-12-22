from typing import TYPE_CHECKING, Annotated, Literal

import sqlalchemy as sa
from msgspec import UNSET, Meta, Struct, UnsetType
from pyramid.httpexceptions import HTTPUnauthorized
from pyramid.interfaces import ISecurityPolicy
from pyramid.request import Request
from pyramid.security import forget
from sqlalchemy.orm import aliased, undefer

from nextgisweb.env import DBSession, gettext, gettextf, inject
from nextgisweb.lib.apitype import (
    AnyOf,
    AsJSON,
    DatetimeNaive,
    EmptyObject,
    StatusCode,
    struct_items,
)

from nextgisweb.core.exception import ValidationError
from nextgisweb.jsrealm import TSExport
from nextgisweb.pyramid.util import gensecret

from .component import AuthComponent
from .model import Group, Principal, User
from .permission import Permission
from .permission import auth as permission_auth
from .permission import manage as permission_manage
from .policy import AuthMedium, AuthProvider
from .util import reset_slg_cookie, sync_ulg_cookie
from .view import GroupID, UserID, group_factory, user_factory

KEYNAME_PATTERN = r"^[A-Za-z][A-Za-z0-9_\-]*$"

KeynameUser = Annotated[str, Meta(pattern=KEYNAME_PATTERN, examples=["administrator", "guest"])]
KeynameGroup = Annotated[str, Meta(pattern=KEYNAME_PATTERN, examples=["administrators"])]
DisplayName = Annotated[str, Meta(min_length=1)]
Description = Annotated[str, Meta(examples=[None])]
Language = Annotated[str, Meta(pattern=r"^[a-z]{2,3}(\-[a-z]{2,3})?$", examples=["en", "zh-cn"])]
OAuthSubject = Annotated[str, Meta(examples=["a223836c-2678-4096-8608-0bd7a12bd25f"])]

Brief = Annotated[bool, Meta(description="Return limited set of attributes")]


def brief_or_permission(request, brief: Brief):
    if not brief:
        request.user.require_permission(any, *permission_auth)


def serialize_principal(src, cls, *, tr):
    attrs = dict()
    cls = getattr(cls, "__origin__", cls)
    for k in cls.__struct_fields__:
        if k == "display_name":
            attrs[k] = tr(src.display_name_i18n)
        elif k in ("members", "member_of"):
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
def deserialize_principal(
    src,
    obj,
    *,
    create: bool,
    request: Request,
    auth: AuthComponent,
):
    updated = set()

    is_group = isinstance(obj, Group)
    is_user = isinstance(obj, User)

    administrator_check = False

    def require_administrator():
        nonlocal administrator_check
        if not administrator_check:
            request.require_administrator()
            administrator_check = True

    with DBSession.no_autoflush:
        for k, v in struct_items(src):
            attr = k
            if k == "alink":
                attr = "alink_token"

            if (
                k == "display_name"
                and not create
                and request.translate(obj.display_name_i18n) == v
            ):
                continue
            elif k in ("members", "member_of") and set(m.id for m in getattr(obj, k)) == set(v):
                continue
            elif k == "permissions" and (set() if create else set(obj.permissions)) == set(v):
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

            if (
                (obj.system is True)
                or (k in ("register", "oauth_mapping", "permissions", "alink"))
                or (not create and is_user and obj.is_administrator)
            ):
                require_administrator()

            if k == "keyname":
                validate_keyname(obj, v)
            elif k == "display_name":
                validate_display_name(obj, v)
            elif k == "members":
                validate_members(obj, v)
                v = [User.filter_by(id=id).one() for id in v]
            elif k == "member_of":
                v = [Group.filter_by(id=id).one() for id in v]
                adm_before = any(g.keyname == "administrators" for g in obj.member_of)
                adm_after = any(g.keyname == "administrators" for g in v)
                if adm_before != adm_after:
                    require_administrator()
            elif k == "password" and v is False:
                v = None
            elif k == "alink":
                v = gensecret(32) if v else None

            setattr(obj, attr, v)
            updated.add(k)

    if create:
        obj.persist()
        DBSession.flush()

    if is_user:
        if (
            auth.options["oauth.server.sync"]
            and obj.oauth_subject is not None
            and "disabled" in updated
        ):
            msgf = (
                gettextf("To disable the user '{dn}', remove them from the team.")
                if obj.disabled
                else gettextf("To enable the user '{dn}', add them to the team.")
            )
            raise ValidationError(msgf(dn=obj.display_name))

        if not obj.disabled:
            if create or "disabled" in updated:
                auth.check_user_limit(obj.id)
            if obj.password_hash is not None and (
                create or "password" in updated or "disabled" in updated
            ):
                auth.check_user_limit_local(obj.id)

    return updated


if TYPE_CHECKING:
    PermissionItem = str
else:
    identities = Permission.registry.keys()
    PermissionItem = Annotated[Literal[tuple(identities)], TSExport("Permission")]


class UserRef(Struct, kw_only=True):
    id: UserID


class UserCreate(Struct, kw_only=True):
    keyname: KeynameUser
    display_name: DisplayName
    description: Description | None | UnsetType = UNSET
    disabled: bool | UnsetType = UNSET
    password: bool | str | UnsetType = UNSET
    alink: bool | UnsetType = UNSET
    language: Language | None | UnsetType = UNSET
    member_of: list[GroupID] | UnsetType = UNSET
    permissions: list[PermissionItem] | UnsetType = UNSET


class UserRead(Struct, kw_only=True):
    id: UserID
    system: bool
    keyname: KeynameUser
    display_name: DisplayName
    is_administrator: bool
    superuser: bool
    disabled: bool
    password: bool
    alink: str | None
    description: Description | None
    language: Language | None
    last_activity: DatetimeNaive | None
    oauth_subject: OAuthSubject | None
    oauth_tstamp: DatetimeNaive | None
    member_of: list[GroupID]
    permissions: list[PermissionItem]


class UserReadBrief(Struct, kw_only=True):
    id: UserID
    system: bool
    keyname: KeynameUser
    display_name: DisplayName
    is_administrator: bool
    disabled: bool
    password: bool
    last_activity: DatetimeNaive | None
    oauth_subject: OAuthSubject | None


class UserUpdate(Struct, kw_only=True):
    keyname: KeynameUser | UnsetType = UNSET
    display_name: DisplayName | UnsetType = UNSET
    description: Description | None | UnsetType = UNSET
    disabled: bool | UnsetType = UNSET
    password: bool | str | UnsetType = UNSET
    alink: bool | UnsetType = UNSET
    language: Language | None | UnsetType = UNSET
    member_of: list[GroupID] | UnsetType = UNSET
    permissions: list[PermissionItem] | UnsetType = UNSET


UserCGetResponse = AnyOf[AsJSON[list[UserRead]], AsJSON[list[UserReadBrief]]]
UserIGetResponse = AnyOf[UserRead, UserReadBrief]


def user_cget(request, *, brief: Brief = False) -> UserCGetResponse:
    """Read users

    :returns: Array of user objects"""
    brief_or_permission(request, brief)

    q = User.query().options(undefer(User.is_administrator))
    if request.authenticated_userid is None:
        q = q.filter_by(system=True)

    cls = UserReadBrief if brief else UserRead
    tr = request.translate
    return [serialize_principal(o, cls, tr=tr) for o in q]


def user_cpost(request, *, body: UserCreate) -> Annotated[UserRef, StatusCode(201)]:
    """Create user

    :returns: User reference"""
    request.user.require_permission(permission_manage)

    obj = User(system=False)
    deserialize_principal(body, obj, create=True, request=request)

    request.response.status_code = 201
    return UserRef(id=obj.id)


def user_iget(obj, request, *, brief: Brief = False) -> UserIGetResponse:
    """Read user

    :returns: User object"""
    brief_or_permission(request, brief)

    cls = UserReadBrief if brief else UserRead
    return serialize_principal(obj, cls, tr=request.translate)


def user_iput(obj, request, *, body: UserUpdate) -> UserRef:
    """Update user

    :returns: User reference"""
    request.user.require_permission(permission_manage)

    updated = deserialize_principal(body, obj, create=False, request=request)

    if obj.id != request.authenticated_userid and ({"keyname", "password", "alink"} & updated):
        auth_policy = request.registry.getUtility(ISecurityPolicy)
        auth_policy.forget_user(obj.id, request)

    if {"member_of", "disabled"} & updated:
        check_last_administrator()

    return UserRef(id=obj.id)


def user_idelete(obj, request) -> EmptyObject:
    """Delete user"""
    if obj.is_administrator:
        request.require_administrator()
    else:
        request.user.require_permission(permission_manage)

    check_principal_delete(obj)
    DBSession.delete(obj)

    check_last_administrator()


class GroupRef(Struct, kw_only=True):
    id: GroupID


class GroupCreate(Struct, kw_only=True):
    keyname: KeynameGroup
    display_name: DisplayName
    description: Description | None | UnsetType = UNSET
    register: bool | UnsetType = UNSET
    oauth_mapping: bool | UnsetType = UNSET
    members: list[UserID] | UnsetType = UNSET
    permissions: list[PermissionItem] | UnsetType = UNSET


class GroupRead(Struct, kw_only=True):
    id: GroupID
    system: bool
    keyname: KeynameGroup
    display_name: DisplayName
    description: Description | None
    register: bool
    oauth_mapping: bool
    members: list[UserID]
    permissions: list[PermissionItem]


class GroupReadBrief(Struct, kw_only=True):
    id: GroupID
    system: bool
    keyname: KeynameGroup
    display_name: DisplayName


class GroupUpdate(Struct, kw_only=True):
    keyname: KeynameGroup | UnsetType = UNSET
    display_name: DisplayName | UnsetType = UNSET
    description: Description | None | UnsetType = UNSET
    register: bool | UnsetType = UNSET
    oauth_mapping: bool | UnsetType = UNSET
    members: list[UserID] | UnsetType = UNSET
    permissions: list[PermissionItem] | UnsetType = UNSET


GroupCGetResponse = AnyOf[AsJSON[list[GroupRead]], AsJSON[list[GroupReadBrief]]]
GroupIGetResponse = AnyOf[GroupRead, GroupReadBrief]


def group_cget(request, *, brief: Brief = False) -> GroupCGetResponse:
    """Read groups

    :returns: Array of group objects"""
    brief_or_permission(request, brief)

    q = Group.query()
    if request.authenticated_userid is None:
        q = q.filter_by(system=True)

    cls = GroupReadBrief if brief else GroupRead
    tr = request.translate
    return [serialize_principal(o, cls, tr=tr) for o in q]


def group_cpost(request, *, body: GroupCreate) -> Annotated[GroupRef, StatusCode(201)]:
    """Create group

    :returns: Group reference"""
    request.user.require_permission(permission_manage)

    obj = Group(system=False)
    deserialize_principal(body, obj, create=True, request=request)

    request.response.status_code = 201
    return GroupRef(id=obj.id)


def group_iget(obj, request, *, brief: Brief = False) -> GroupIGetResponse:
    """Read group

    :returns: Group object"""
    brief_or_permission(request, brief)

    cls = GroupReadBrief if brief else GroupRead
    return serialize_principal(obj, cls, tr=request.translate)


def group_iput(obj, request, *, body: GroupUpdate) -> GroupRef:
    """Update group

    :returns: Group reference"""
    request.user.require_permission(permission_manage)

    updated = deserialize_principal(body, obj, create=False, request=request)
    if {"members"} & updated:
        check_last_administrator()
    return GroupRef(id=obj.id)


def group_idelete(obj, request) -> EmptyObject:
    """Delete group"""
    request.user.require_permission(permission_manage)

    check_principal_delete(obj)
    DBSession.delete(obj)


class ProfileRead(Struct, kw_only=True):
    keyname: KeynameUser
    oauth_subject: OAuthSubject | None
    language: Language | None


class ProfileUpdate(Struct, kw_only=True):
    language: Language | UnsetType = UNSET


def profile_get(request) -> ProfileRead:
    """Read profile of the current user

    :returns: User profile"""
    if request.user.keyname == "guest":
        return HTTPUnauthorized()
    return serialize_principal(request.user, ProfileRead, tr=request.translate)


def profile_put(request, body: ProfileUpdate) -> EmptyObject:
    """Update profile of the current user"""
    if request.user.keyname == "guest":
        raise HTTPUnauthorized()

    deserialize_principal(body, request.user, create=False, request=request)
    sync_ulg_cookie(request)


class CurrentUser(Struct, kw_only=True):
    id: UserID
    keyname: KeynameUser
    display_name: Annotated[DisplayName, Meta(examples=["Administrator"])]
    language: Language
    auth_medium: AuthMedium | None
    auth_provider: AuthProvider | None


def current_user(
    request,
    *,
    require_authenticated: bool = False,
    refresh_session: bool = False,
) -> CurrentUser:
    """Read current user info

    :param require_authenticated: Return 401 Unauthorized for unauthenticated guests
    :param refresh_session: Refresh session authorization for testing purposes
    :returns: User info"""

    policy = request.registry.getUtility(ISecurityPolicy)
    with policy.refresh_session_context(refresh_session):
        user = request.user
        if require_authenticated and user.keyname == "guest":
            raise HTTPUnauthorized()

        result = CurrentUser(
            id=user.id,
            keyname=user.keyname,
            display_name=user.display_name,
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


class LoginResponse(Struct, kw_only=True):
    id: UserID
    keyname: KeynameUser
    display_name: DisplayName
    home_url: str | UnsetType = UNSET


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
    sync_ulg_cookie(request, user=user)
    reset_slg_cookie(request)

    if event.next_url:
        result.home_url = event.next_url

    return result


def logout(request) -> EmptyObject:
    """Log out and close session"""
    headers = forget(request)
    request.response.headerlist.extend(headers)


def permission(request) -> AsJSON[dict[PermissionItem, str]]:
    """Read user permission schema"""
    tr = request.translate
    return {k: tr(v.label) for k, v in Permission.registry.items()}


def setup_pyramid(comp, config):
    config.add_route(
        "auth.user.collection",
        "/api/component/auth/user/",
        get=user_cget,
        post=user_cpost,
    )

    config.add_route(
        "auth.user.item",
        "/api/component/auth/user/{id}",
        factory=user_factory,
        get=user_iget,
        put=user_iput,
        delete=user_idelete,
    )

    config.add_route(
        "auth.profile",
        "/api/component/auth/profile",
        get=profile_get,
        put=profile_put,
    )

    config.add_route(
        "auth.group.collection",
        "/api/component/auth/group/",
        get=group_cget,
        post=group_cpost,
    )

    config.add_route(
        "auth.group.item",
        "/api/component/auth/group/{id}",
        factory=group_factory,
        get=group_iget,
        put=group_iput,
        delete=group_idelete,
    )

    config.add_route(
        "auth.current_user",
        "/api/component/auth/current_user",
        get=current_user,
    )

    config.add_route(
        "auth.login_cookies",
        "/api/component/auth/login",
        post=login,
    )

    config.add_route(
        "auth.logout_cookies",
        "/api/component/auth/logout",
        post=logout,
    )

    config.add_route(
        "auth.permission",
        "/api/component/auth/permission",
        get=permission,
    )


def validate_members(obj, members):
    user = User.filter(
        User.system,
        User.keyname != "guest",
        User.id.in_(members),
    ).first()
    if user is not None:
        m = gettext("User '%s' can't be a member of a group.")
        raise ValidationError(message=m % user.display_name)


@inject()
def check_principal_delete(obj, *, auth: AuthComponent):
    if obj.system:
        raise ValidationError(message=gettext("System principals can't be deleted."))
    if (
        isinstance(obj, User)
        and auth.options["oauth.server.sync"]
        and obj.oauth_subject is not None
        and not obj.disabled
    ):
        raise ValidationError(
            gettextf("To delete the user '{dn}', remove them from the team first.")(
                dn=obj.display_name
            )
        )
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
