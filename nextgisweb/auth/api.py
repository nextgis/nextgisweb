import re

import sqlalchemy as sa
from pyramid.httpexceptions import HTTPForbidden, HTTPUnauthorized
from pyramid.interfaces import ISecurityPolicy
from pyramid.security import forget
from sqlalchemy.orm import aliased, undefer

from nextgisweb.env import DBSession, _

from nextgisweb.core.exception import ValidationError
from nextgisweb.pyramid import JSONType

from .model import Group, Principal, User

keyname_pattern = re.compile(r'^[A-Za-z][A-Za-z0-9_\-]*$')
brief_keys = (
    'id', 'system', 'keyname', 'display_name', 'disabled',
    'password', 'oauth_subject', 'last_activity', 'is_administrator')


def user_cget(request) -> JSONType:
    brief = request.GET.get('brief') in ('true', 'yes', '1')
    brief or request.require_administrator()

    q = User.query()
    if request.authenticated_userid is None:
        q = q.filter_by(system=True)

    result = []
    for o in q.options(undefer(User.is_administrator)):
        data = o.serialize()
        if brief:
            data = {k: v for k, v in data.items() if k in brief_keys}
        result.append(data)

    return result


def user_cpost(request) -> JSONType:
    request.require_administrator()

    data = request.json_body
    obj = User(system=False)
    check_keyname(obj, data)
    check_display_name(obj, data)
    obj.deserialize(data)
    obj.persist()

    DBSession.flush()
    return dict(id=obj.id)


def user_iget(request) -> JSONType:
    request.require_administrator()
    obj = User.filter_by(id=int(request.matchdict['id'])).options(
        undefer(User.is_administrator),
    ).one()
    return obj.serialize()


def user_iput(request) -> JSONType:
    request.require_administrator()

    data = request.json_body
    obj = User.filter_by(id=int(request.matchdict['id'])).one()

    if (
        obj.id != request.authenticated_userid and (
            ('keyname' in data and obj.keyname != data['keyname'])
            or ('password' in data and data['password'] is not True)
            or data.get('alink_token') is not None
        )
    ):
        auth_policy = request.registry.getUtility(ISecurityPolicy)
        auth_policy.forget_user(obj.id, request)

    check_keyname(obj, data)
    check_display_name(obj, data)
    check_system_user(obj, data)
    obj.deserialize(data)
    check_last_administrator()
    return dict(id=obj.id)


def user_idelete(request) -> JSONType:
    request.require_administrator()

    obj = User.filter_by(id=int(request.matchdict['id'])).one()
    check_principal_delete(obj)
    DBSession.delete(obj)
    check_last_administrator()
    return None


def profile_get(request) -> JSONType:
    user = request.user

    if user.keyname == 'guest':
        return HTTPUnauthorized()

    data = user.serialize()

    result = dict()
    for k in ('language', 'oauth_subject'):
        result[k] = data[k]

    return result


def profile_set(request) -> JSONType:
    user = request.user

    if user.keyname == 'guest':
        return HTTPUnauthorized()

    data = request.json_body
    for k in data:
        if k not in ('language', ):
            raise ValidationError("Attribute '%s' is not allowed!" % k)

    user.deserialize(data)

    return None


def group_cget(request) -> JSONType:
    brief = request.GET.get('brief') in ('true', 'yes', '1')
    brief or request.require_administrator()

    q = Group.query()
    if request.authenticated_userid is None:
        q = q.filter_by(system=True)

    result = []
    for o in q:
        data = o.serialize()
        if brief:
            data = {k: v for k, v in data.items() if k in brief_keys}
        result.append(data)

    return result


def group_cpost(request) -> JSONType:
    request.require_administrator()

    data = request.json_body
    obj = Group(system=False)
    check_keyname(obj, data)
    check_display_name(obj, data)
    check_group_members(obj, data)
    obj.deserialize(data)
    obj.persist()

    DBSession.flush()
    return dict(id=obj.id)


def group_iget(request) -> JSONType:
    request.require_administrator()
    obj = Group.filter_by(id=int(request.matchdict['id'])).one()
    return obj.serialize()


def group_iput(request) -> JSONType:
    request.require_administrator()

    data = request.json_body
    obj = Group.filter_by(id=int(request.matchdict['id'])).one()
    check_keyname(obj, data)
    check_display_name(obj, data)
    check_system_group(obj, data)
    check_group_members(obj, data)
    obj.deserialize(data)
    check_last_administrator()
    return dict(id=obj.id)


def group_idelete(request) -> JSONType:
    request.require_administrator()

    obj = Group.filter_by(id=int(request.matchdict['id'])).one()
    check_principal_delete(obj)
    DBSession.delete(obj)
    return None


def current_user(request) -> JSONType:
    result = dict(
        id=request.user.id,
        keyname=request.user.keyname,
        display_name=request.user.display_name,
        language=request.locale_name)

    if aresult := request.environ.get('auth.result'):
        if val := aresult.med:
            result['auth_medium'] = val
        if val := aresult.prv:
            result['auth_provider'] = val

    return result


def register(request) -> JSONType:
    if not request.env.auth.options['register']:
        raise HTTPForbidden(explanation="Anonymous registration is not allowed!")

    # For self-registration only certain attributes of the user are required
    rkeys = ('display_name', 'description', 'keyname', 'password')
    src = request.json_body
    data = dict()
    for k in rkeys:
        if k in src:
            data[k] = src[k]

    # Add groups automatically assigned on registration
    data['member_of'] = map(
        lambda group: group.id,
        Group.filter_by(register=True))

    obj = User(system=False)
    obj.deserialize(data)
    obj.persist()

    DBSession.flush()
    return dict(id=obj.id)


def login(request) -> JSONType:
    if len(request.POST) > 0:
        login = request.POST.get('login')
        password = request.POST.get('password')
    else:
        json_body = request.json_body
        if not isinstance(json_body, dict):
            raise ValidationError()
        login = json_body.get('login')
        password = json_body.get('password')

    if not isinstance(login, str) or not isinstance(password, str):
        raise ValidationError()

    policy = request.registry.getUtility(ISecurityPolicy)
    user, headers, event = policy.login(login, password, request=request)
    request.response.headerlist.extend(headers)

    result = dict(
        id=user.id, keyname=user.keyname,
        display_name=user.display_name)

    if event.next_url:
        result['home_url'] = event.next_url

    return result


def logout(request) -> JSONType:
    headers = forget(request)
    request.response.headerlist.extend(headers)
    return dict()


def setup_pyramid(comp, config):
    config.add_route('auth.user.collection', '/api/component/auth/user/') \
        .add_view(user_cget, request_method='GET') \
        .add_view(user_cpost, request_method='POST')

    config.add_route('auth.user.item', '/api/component/auth/user/{id}') \
        .add_view(user_iget, request_method='GET') \
        .add_view(user_iput, request_method='PUT') \
        .add_view(user_idelete, request_method='DELETE')

    config.add_route('auth.profile', '/api/component/auth/profile') \
        .add_view(profile_get, request_method='GET') \
        .add_view(profile_set, request_method='PUT')

    config.add_route('auth.group.collection', '/api/component/auth/group/') \
        .add_view(group_cget, request_method='GET') \
        .add_view(group_cpost, request_method='POST')

    config.add_route('auth.group.item', '/api/component/auth/group/{id}') \
        .add_view(group_iget, request_method='GET') \
        .add_view(group_iput, request_method='PUT') \
        .add_view(group_idelete, request_method='DELETE')

    config.add_route('auth.current_user', '/api/component/auth/current_user') \
        .add_view(current_user, request_method='GET')

    config.add_route('auth.register', '/api/component/auth/register') \
        .add_view(register, request_method='POST')

    config.add_route('auth.login_cookies', '/api/component/auth/login') \
        .add_view(login, request_method='POST')

    config.add_route('auth.logout_cookies', '/api/component/auth/logout') \
        .add_view(logout, request_method='POST')


class SystemPrincipalAttributeReadOnly(ValidationError):

    def __init__(self, attr):
        super().__init__(message=_(
            "The '%s' attribute of the system principal can't be changed."
        ) % attr)


class PrincipalNotUnique(ValidationError):

    def __init__(self, attr, value):
        if attr == 'keyname':
            message = _("Principal '%s' already exists.") % value
        elif attr == 'display_name':
            message = _("Principal with full name '%s' already exists.") % value
        else:
            raise ValueError(f"Invalid attribute: {attr}")
        super().__init__(message=message)


def check_system_user(obj, data):
    if not obj.system:
        return

    for k, v in data.items():
        if not (getattr(obj, k) == data[k] or (
            obj.keyname == 'guest' and k == 'member_of'
        )):
            raise SystemPrincipalAttributeReadOnly(k)


def check_system_group(obj, data):
    if not obj.system:
        return

    allowed_attrs = ('register', 'members', 'oauth_mapping')
    for k in data:
        if not (getattr(obj, k) == data[k] or k in allowed_attrs):
            raise SystemPrincipalAttributeReadOnly(k)


def check_group_members(obj, data):
    if 'members' not in data:
        return

    user = User.filter(
        User.system,
        User.keyname != 'guest',
        User.id.in_(data['members'])).first()
    if user is not None:
        raise ValidationError(message=_(
            "User '%s' can't be a member of a group.") % user.display_name)


def check_principal_delete(obj):
    if obj.system:
        raise ValidationError(message=_(
            "System principals can't be deleted."))
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
            message=_("User is referenced with resources")
            if isinstance(obj, User) else _("Group is referenced with resources"),
            data=dict(references_data=references_data))


def check_keyname(obj, data):
    if 'keyname' not in data or obj.keyname == data['keyname']:
        return

    principal_cls = type(obj)
    keyname = data['keyname']

    if not keyname_pattern.match(keyname):
        raise ValidationError(message=_(
            "Invalid principal name: '%s'.") % keyname)

    query = principal_cls.filter(
        sa.func.lower(principal_cls.keyname) == keyname.lower())
    if obj.id is not None:
        query = query.filter(principal_cls.id != obj.id)

    is_unique = not DBSession.query(query.exists()).scalar()
    if not is_unique:
        raise PrincipalNotUnique('keyname', keyname)


def check_display_name(obj, data):
    if 'display_name' not in data or obj.display_name == data['display_name']:
        return

    display_name = data['display_name']

    query = Principal.filter(
        Principal.cls == obj.cls,
        sa.func.lower(Principal.display_name) == display_name.lower())
    if obj.id is not None:
        query = query.filter(Principal.id != obj.id)

    is_unique = not DBSession.query(query.exists()).scalar()
    if not is_unique:
        raise PrincipalNotUnique('display_name', display_name)


def check_last_administrator():
    member = aliased(User, flat=True)
    query = DBSession.query(Group).filter_by(keyname='administrators') \
        .join(Group.members.of_type(member)).filter_by(disabled=False).limit(1)
    if query.count() == 0:
        raise ValidationError(message=_(
            "The 'administrators' group must have at least one enabled member."
        ))
