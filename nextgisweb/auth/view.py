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

from ..gui import REACT_RENDERER
from ..models import DBSession
from ..pyramid import SessionStore, WebSession
from ..views import permalinker
from .. import dynmenu as dm

from .model import Principal, User, Group

from .exception import InvalidCredentialsException, UserDisabledException
from .oauth import InvalidTokenException, AuthorizationException
from .api import OnUserLogin
from .util import _


def login(request):
    next_url = request.params.get('next', request.application_url)

    # TODO: Remove in 4.3+ release! We might need it for GDAL driver or
    # something else. But /api/compoment/auth/login must be used there.
    if request.method == 'POST':
        try:
            user, headers = request.env.auth.authenticate(
                request, request.POST['login'].strip(), request.POST['password'])
        except (InvalidCredentialsException, UserDisabledException) as exc:
            return dict(error=exc.title, next_url=next_url)

        event = OnUserLogin(user, request, next_url)
        zope.event.notify(event)

        return HTTPFound(location=event.next_url, headers=headers)

    return dict(
        custom_layout=True, next_url=next_url,
        props=dict(reloadAfterLogin=False),
        title=_('Sign in to Web GIS'))


def session_invite(request):
    next_url = request.params.get('next', request.application_url)

    if request.method == 'GET':
        if any(k not in request.GET for k in ('sid', 'expires')):
            raise HTTPNotFound()

        return dict(
            session_id=request.GET['sid'],
            expires=request.GET['expires'],
            next_url=next_url)

    elif request.method == 'POST':
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


def oauth(request):
    oaserver = request.env.auth.oauth

    if oaserver is None:
        no_oauth = request.params.get('na')
        if no_oauth == 'next':
            return HTTPFound(request.params.get(
                'next', request.application_url))
        elif no_oauth == 'login':
            return HTTPFound(request.route_url('auth.login', _query=(
                dict(next=request.params['next'])
                if 'next' in request.params else dict())
            ))
        else:
            raise HTTPNotFound()

    oauth_url = request.route_url('auth.oauth')
    oauth_path = request.route_path('auth.oauth')

    def cookie_name(state):
        return 'ngw-oastate-' + state

    if error := request.params.get('error'):
        title = None
        message = None

        if (
            oaserver.options['server.type'] == 'nextgisid'
            and error == 'invalid_scope'
        ):
            title = _("Team membership required")
            message = _(
                "You are not a member of this Web GIS team. Contact Web GIS "
                "administrator and ask to be added to the team.")

        raise AuthorizationException(title=title, message=message)

    elif 'code' in request.params and 'state' in request.params:
        # Extract data from state named cookie
        state = request.params['state']
        try:
            data = dict(parse_qsl(request.cookies[cookie_name(state)]))
        except ValueError:
            raise AuthorizationException("State cookie parse error")

        tresp = oaserver.grant_type_authorization_code(
            request.params['code'], oauth_url)

        if data['bind'] == '1' and request.user.keyname != 'guest':
            user = oaserver.access_token_to_user(
                tresp.access_token, bind_user=request.user)
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
            bind=request.params.get('bind', '0')
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

    response = HTTPFound(location=location, headers=headers)

    # Cookie for loop prevention with default OAuth
    if oaserver and oaserver.options['default']:
        response.set_cookie('ngw-oauth-logout', max_age=600, httponly=True)

    return response


def _login_url(request):
    """ Request method for getting preferred login url (local or OAuth) """

    auth = request.env.auth

    login_qs = dict()
    if request.matched_route is None or request.matched_route.name not in (
        auth.options['login_route_name'], auth.options['logout_route_name']
    ):
        login_qs['next'] = request.url

    oauth_opts = auth.options.with_prefix('oauth')
    if oauth_opts['enabled'] and oauth_opts['default'] and oauth_opts['server.authorization_code']:
        login_url = request.route_url('auth.oauth', _query=login_qs)
    else:
        login_url = request.route_url(auth.options['login_route_name'], _query=login_qs)

    return login_url


def forbidden_error_handler(request, err_info, exc, exc_info, **kwargs):
    oaserver = request.env.auth.oauth

    # If user is not authentificated, we can offer him to sign in
    if (
        request.method == 'GET'
        and not request.is_api and not request.is_xhr
        and err_info.http_status_code == 403
        and request.authenticated_userid is None
    ):
        if oaserver and oaserver.options['default']:
            if 'ngw-oauth-logout' in request.cookies:
                # Loop prevention, bypass the handler
                return
            else:
                return HTTPFound(
                    location=request.route_path('auth.oauth', _query=dict(
                        next=request.path_qs)))
        else:
            response = render_to_response('nextgisweb:auth/template/login.mako', dict(
                custom_layout=True, props=dict(reloadAfterLogin=True),
            ), request=request)
            response.status = 403
            return response


def settings(request):
    if request.user.keyname == 'guest':
        return HTTPUnauthorized()

    return dict(
        title=_("User settings"),
        entrypoint='@nextgisweb/auth/settings-form')


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
        'auth.session_invite',
        '/session-invite'
    ).add_view(session_invite, renderer='nextgisweb:auth/template/session_invite.mako')

    config.add_route('auth.logout', '/logout').add_view(logout)

    config.add_route('auth.oauth', '/oauth', client=True).add_view(oauth)

    config.add_route('auth.settings', '/settings', client=True) \
        .add_view(settings, renderer=REACT_RENDERER)

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

    config.add_route('auth.user.browse', '/auth/user/', client=True) \
        .add_view(user_browse, renderer=REACT_RENDERER)
    config.add_route('auth.user.create', '/auth/user/create', client=True) \
        .add_view(user_create_or_edit, renderer=REACT_RENDERER)
    config.add_route('auth.user.edit', '/auth/user/{id:\\d+}', client=True) \
        .add_view(user_create_or_edit, renderer=REACT_RENDERER)

    config.add_route('auth.group.browse', '/auth/group/', client=True) \
        .add_view(group_browse, renderer=REACT_RENDERER)
    config.add_route('auth.group.create', '/auth/group/create', client=True) \
        .add_view(group_create_or_edit, renderer=REACT_RENDERER)
    config.add_route('auth.group.edit', '/auth/group/{id:\\d+}', client=True) \
        .add_view(group_create_or_edit, renderer=REACT_RENDERER)

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
