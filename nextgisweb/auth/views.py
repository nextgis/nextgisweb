import json
from datetime import datetime
from urllib.parse import urlencode, parse_qsl

import string
import secrets
import zope.event
import sqlalchemy as sa

from pyramid.events import BeforeRender
from pyramid.security import remember, forget
from pyramid.renderers import render_to_response
from pyramid.httpexceptions import HTTPFound, HTTPNotFound, HTTPUnauthorized
from sqlalchemy.orm.exc import NoResultFound

from ..models import DBSession
from ..pyramid import SessionStore, WebSession
from ..views import  permalinker
from .. import dynmenu as dm

from .models import Principal, User, Group

from .exception import InvalidCredentialsException, UserDisabledException
from .oauth import InvalidTokenException, AuthorizationException
from .util import _


class OnUserLogin(object):

    def __init__(self, user, request, next_url):
        self._user = user
        self._request = request
        self._next_url = next_url

    @property
    def user(self):
        return self._user

    @property
    def request(self):
        return self._request

    @property
    def next_url(self):
        return self._next_url

    def set_next_url(self, url):
        self._next_url = url


def login(request):
    next_url = request.params.get('next', request.application_url)

    if request.method == 'POST':
        if 'sid' in request.POST:
            sid = request.POST['sid']
            expires = request.POST['expires']

            try:
                store = SessionStore.filter_by(session_id=sid, key='auth.policy.current').one()
            except NoResultFound:
                raise InvalidCredentialsException(message=_("Session not found."))
            value = json.loads(store.value)

            exp = datetime.fromtimestamp(value[2])
            if datetime.fromisoformat(expires) != exp:
                raise InvalidCredentialsException(message=_("Invalid 'expires' parameter."))
            now = datetime.utcnow()
            if exp <= now:
                raise InvalidCredentialsException(message=_("Session expired."))

            cookie_settings = WebSession.cookie_settings(request)
            cookie_settings['max_age'] = int((exp - now).total_seconds())

            cookie_name = request.env.pyramid.options['session.cookie.name']

            response = HTTPFound(location=next_url)
            response.set_cookie(cookie_name, value=sid, **cookie_settings)

            return response
        else:
            try:
                user, headers = request.env.auth.authenticate(
                    request, request.POST['login'].strip(), request.POST['password'])
            except (InvalidCredentialsException, UserDisabledException) as exc:
                return dict(error=exc.title, next_url=next_url)

            event = OnUserLogin(user, request, next_url)
            zope.event.notify(event)

            return HTTPFound(location=event.next_url, headers=headers)

    return dict(next_url=next_url)


def session_invite(request):
    if any(k not in request.GET for k in ('sid', 'expires')):
        raise HTTPNotFound()

    return dict(
        session_id=request.GET['sid'],
        expires=request.GET['expires'],
        next_url=request.GET.get('next'))


def oauth(request):
    oaserver = request.env.auth.oauth

    oauth_url = request.route_url('auth.oauth')
    oauth_path = request.route_path('auth.oauth')

    def cookie_name(state):
        return 'ngw-oastate-' + state

    if 'error' in request.params:
        raise AuthorizationException()

    elif 'code' in request.params and 'state' in request.params:
        # Extract data from state named cookie
        state = request.params['state']
        try:
            data = dict(parse_qsl(request.cookies[cookie_name(state)]))
        except ValueError:
            raise AuthorizationException("State cookie parse error")

        tresp = oaserver.grant_type_authorization_code(
            request.params['code'], oauth_url)

        if data['merge'] == '1' and request.user.keyname != 'guest':
            user = oaserver.access_token_to_user(tresp.access_token, merge_user=request.user)
        else:
            user = oaserver.access_token_to_user(tresp.access_token)

        if user is None:
            raise InvalidTokenException()

        DBSession.flush()
        headers = remember(request, (user.id, tresp))

        event = OnUserLogin(user, request, data['next_url'])
        zope.event.notify(event)

        response = HTTPFound(location=event.next_url, headers=headers)
        response.delete_cookie(cookie_name(state), path=oauth_path)
        return response

    else:
        data = dict(
            next_url=request.params.get('next', request.application_url),
            merge=request.params.get('merge', '0')
        )

        alphabet = string.ascii_letters + string.digits
        state = ''.join(secrets.choice(alphabet) for i in range(16))
        ac_url = oaserver.authorization_code_url(oauth_url, state=state)

        response = HTTPFound(location=ac_url)

        # Store data in state named cookie
        response.set_cookie(
            cookie_name(state), value=urlencode(data),
            path=oauth_path, max_age=600, httponly=True)

        return response


def logout(request):
    oaserver = request.env.auth.oauth

    location = request.application_url

    if oaserver is not None:
        logout_endpoint = oaserver.options.get('server.logout_endpoint')
        if logout_endpoint is not None:
            current = request.session.get('auth.policy.current')
            if current is not None and current[0] == 'OAUTH':
                qs = dict(redirect_uri=request.application_url)
                location = logout_endpoint + '?' + urlencode(qs)

    headers = forget(request)

    return HTTPFound(location=location, headers=headers)


def _login_url(request):
    """ Request method for getting preferred login url (local or OAuth) """

    auth = request.env.auth

    login_qs = dict()
    if request.matched_route is None or request.matched_route.name not in (
        auth.options['login_route_name'], auth.options['logout_route_name']
    ):
        login_qs['next'] = request.url

    oauth_opts = auth.options.with_prefix('oauth')
    if oauth_opts['enabled'] and oauth_opts['default'] and not oauth_opts['server.password']:
        login_url = request.route_url('auth.oauth', _query=login_qs)
    else:
        login_url = request.route_url(auth.options['login_route_name'], _query=login_qs)

    return login_url


def forbidden_error_handler(request, err_info, exc, exc_info, **kwargs):
    # If user is not authentificated, we can offer him to sign in
    if (
        request.method == 'GET'
        and not request.is_api and not request.is_xhr
        and err_info.http_status_code == 403
        and request.authenticated_userid is None
    ):
        response = render_to_response('nextgisweb:auth/template/login.mako', dict(
            auth_required=(
                request.env.auth.options['oauth.enabled']
                and request.env.auth.options['oauth.default']
            ), next_url=request.url,
        ), request=request)
        response.status = 403
        return response


def settings(request):
    if request.user.keyname == 'guest':
        return HTTPUnauthorized()

    return dict(title=_("User settings"))


def user_browse(request):
    request.require_administrator()
    return dict(
        title=_("Users"),
        entrypoint='@nextgisweb/auth/user-browse',
        dynmenu=request.env.pyramid.control_panel)


def user_create_or_edit(request):
    request.require_administrator()

    result = dict(
        entrypoint='@nextgisweb/auth/user-widget',
        dynmenu=request.env.pyramid.control_panel)

    if 'id' not in request.matchdict:
        result['title'] = _("Create new user")
    else:
        try:
            obj = User.filter_by(**request.matchdict).one()
        except NoResultFound:
            raise HTTPNotFound()
        result['props'] = dict(id=obj.id)
        result['title'] = obj.display_name

    return result


def group_browse(request):
    request.require_administrator()
    return dict(
        title=_("Groups"),
        entrypoint='@nextgisweb/auth/group-browse',
        dynmenu=request.env.pyramid.control_panel)


def group_create_or_edit(request):
    request.require_administrator()

    result = dict(
        entrypoint='@nextgisweb/auth/group-widget',
        dynmenu=request.env.pyramid.control_panel)

    if 'id' not in request.matchdict:
        result['title'] = _("Create new group")
    else:
        try:
            obj = Group.filter_by(**request.matchdict).one()
        except NoResultFound:
            raise HTTPNotFound()
        result['props'] = dict(id=obj.id)
        result['title'] = obj.display_name

    return result


def setup_pyramid(comp, config):
    # Add it before default pyramid handlers
    comp.env.pyramid.error_handlers.insert(0, forbidden_error_handler)

    config.add_route('auth.login', '/login') \
        .add_view(login, renderer='nextgisweb:auth/template/login.mako')

    config.add_route(
        'pyramid.session.invite',
        '/session/invite'
    ).add_view(session_invite, renderer='nextgisweb:auth/template/session_invite.mako')

    config.add_route('auth.logout', '/logout').add_view(logout)

    config.add_route('auth.oauth', '/oauth').add_view(oauth)

    config.add_route('auth.settings', '/settings') \
        .add_view(settings, renderer='nextgisweb:auth/template/settings.mako')

    config.add_request_method(_login_url, name='login_url')

    def principal_dump(request):
        query = sa.orm.with_polymorphic(Principal, '*').query()
        result = []

        for p in query:
            result.append(dict(
                id=p.id,
                cls=p.cls,
                system=p.system,
                keyname=p.keyname,
                display_name=p.display_name
            ))

        return result

    config.add_route('auth.principal_dump', '/auth/principal/dump') \
        .add_view(principal_dump, renderer='json')

    react_renderer = 'nextgisweb:gui/template/react_app.mako'
    config.add_route('auth.user.browse', '/auth/user/', client=True) \
        .add_view(user_browse, renderer=react_renderer)
    config.add_route('auth.user.create', '/auth/user/create', client=True) \
        .add_view(user_create_or_edit, renderer=react_renderer)
    config.add_route('auth.user.edit', '/auth/user/{id:\\d+}', client=True) \
        .add_view(user_create_or_edit, renderer=react_renderer)

    config.add_route('auth.group.browse', '/auth/group/', client=True) \
        .add_view(group_browse, renderer=react_renderer)
    config.add_route('auth.group.create', '/auth/group/create', client=True) \
        .add_view(group_create_or_edit, renderer=react_renderer)
    config.add_route('auth.group.edit', '/auth/group/{id:\\d+}', client=True) \
        .add_view(group_create_or_edit, renderer=react_renderer)

    permalinker(User, "auth.user.edit")
    permalinker(Group, "auth.group.edit")

    class AuthComponentMenu(dm.DynItem):

        def build(self, kwargs):
            yield dm.Link(
                self.sub('user'), _("Users"),
                lambda kwargs: kwargs.request.route_url('auth.user.browse'))

            yield dm.Link(
                self.sub('group'), _("Groups"),
                lambda kwargs: kwargs.request.route_url('auth.group.browse'))

    comp.env.pyramid.control_panel.add(
        dm.Label('auth', _("Groups and users")),
        AuthComponentMenu('auth'))

    # Login and logout routes names
    def add_globals(event):
        event['login_route_name'] = comp.options['login_route_name']
        event['logout_route_name'] = comp.options['logout_route_name']

    config.add_subscriber(add_globals, BeforeRender)
