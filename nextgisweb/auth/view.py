import secrets
import string
from datetime import datetime
from urllib.parse import parse_qsl, urlencode

import zope.event
from pyramid.events import BeforeRender
from pyramid.httpexceptions import HTTPFound, HTTPNotFound, HTTPUnauthorized
from pyramid.renderers import render_to_response
from pyramid.security import forget, remember
from sqlalchemy.orm.exc import NoResultFound

from nextgisweb.env import DBSession, _
from nextgisweb.lib import dynmenu as dm

from nextgisweb.pyramid import SessionStore, WebSession, viewargs

from . import permission
from .exception import ALinkException, InvalidCredentialsException, UserDisabledException
from .model import Group, User
from .oauth import AuthorizationException, InvalidTokenException
from .policy import AuthProvider, AuthState, OnUserLogin


@viewargs(renderer="mako")
def login(request):
    next_url = request.params.get("next", request.application_url)
    return dict(
        custom_layout=True,
        next_url=next_url,
        props=dict(reloadAfterLogin=False),
        title=_("Sign in to Web GIS"),
    )


@viewargs(renderer="mako")
def session_invite(request):
    next_url = request.params.get("next", request.application_url)

    if request.method == "GET":
        if any(k not in request.GET for k in ("sid", "expires")):
            raise HTTPNotFound()

        return dict(
            session_id=request.GET["sid"], expires=request.GET["expires"], next_url=next_url
        )

    elif request.method == "POST":
        sid = request.POST["sid"]
        expires = datetime.fromisoformat(request.POST["expires"])

        try:
            state = AuthState.from_dict(
                SessionStore.filter_by(session_id=sid, key="auth.state").one().value
            )
        except NoResultFound:
            raise InvalidCredentialsException(message=_("Session not found."))

        exp = datetime.fromtimestamp(state.exp)
        if expires != exp or state.ref != 0:
            raise InvalidCredentialsException(message=_("Invalid 'expires' parameter."))
        now = datetime.utcnow()
        if exp <= now:
            raise InvalidCredentialsException(message=_("Session expired."))

        cookie_settings = WebSession.cookie_settings(request)
        cookie_name = request.env.pyramid.options["session.cookie.name"]

        response = HTTPFound(location=next_url)
        response.set_cookie(cookie_name, value=sid, **cookie_settings)

        return response


def alink(request):
    if not request.env.auth.options["alink"]:
        raise HTTPNotFound()

    try:
        user = User.filter_by(alink_token=request.matchdict["token"]).one()
    except NoResultFound:
        raise ALinkException(
            message=_(
                "Failed to authenticate using the given authorization link. "
                "Please check the link and contact the administrator."
            )
        )

    if user.disabled:
        raise UserDisabledException()

    if user.is_administrator:
        raise ALinkException(
            message=_("Usage of authorization link is forbidden for administrators.")
        )

    remember(request, (user.id, None))

    next_url = request.params.get("next", request.application_url)
    return HTTPFound(location=next_url)


def oauth(request):
    oaserver = request.env.auth.oauth

    if oaserver is None:
        no_oauth = request.params.get("na")
        if no_oauth == "next":
            return HTTPFound(request.params.get("next", request.application_url))
        elif no_oauth == "login":
            return HTTPFound(
                request.route_url(
                    "auth.login",
                    _query=(
                        dict(next=request.params["next"]) if "next" in request.params else dict()
                    ),
                )
            )
        else:
            raise HTTPNotFound()

    oauth_url = request.route_url("auth.oauth")
    oauth_path = request.route_path("auth.oauth")

    def cookie_name(state):
        return "ngw-oastate-" + state

    if error := request.params.get("error"):
        title = None
        message = None

        if oaserver.options["server.type"] == "nextgisid" and error == "invalid_scope":
            title = _("Team membership required")
            message = _(
                "You are not a member of this Web GIS team. Contact Web GIS "
                "administrator and ask to be added to the team."
            )

        raise AuthorizationException(title=title, message=message)

    elif "code" in request.params and "state" in request.params:
        # Extract data from state named cookie
        state = request.params["state"]
        try:
            data = dict(parse_qsl(request.cookies[cookie_name(state)]))
        except ValueError:
            raise AuthorizationException("State cookie parse error")

        tpair = oaserver.grant_type_authorization_code(request.params["code"], oauth_url)

        atoken = oaserver.query_introspection(tpair.access_token)
        if atoken is None:
            raise InvalidTokenException()

        bind_user = (
            request.user if data["bind"] == "1" and request.user.keyname != "guest" else None
        )
        user = oaserver.access_token_to_user(
            atoken,
            bind_user=bind_user,
            access_token=tpair.access_token,
        )

        DBSession.flush()
        headers = remember(request, (user.id, tpair))

        event = OnUserLogin(user, request, data["next_url"])
        zope.event.notify(event)

        response = HTTPFound(location=event.next_url, headers=headers)
        response.delete_cookie(cookie_name(state), path=oauth_path)
        return response

    else:
        data = dict(
            next_url=request.params.get("next", request.application_url),
            bind=request.params.get("bind", "0"),
        )

        alphabet = string.ascii_letters + string.digits
        state = "".join(secrets.choice(alphabet) for i in range(16))
        ac_url = oaserver.authorization_code_url(oauth_url, state=state)

        response = HTTPFound(location=ac_url)

        # Store data in state named cookie
        response.set_cookie(
            cookie_name(state), value=urlencode(data), path=oauth_path, max_age=600, httponly=True
        )

        return response


def logout(request):
    oaserver = request.env.auth.oauth

    location = request.application_url

    if oaserver is not None:
        logout_endpoint = oaserver.options.get("server.logout_endpoint")
        if logout_endpoint is not None:
            state = request.session.get("auth.state")
            if state is not None:
                state = AuthState.from_dict(state)
                if state.prv == AuthProvider.OAUTH_AC:
                    qs = dict(redirect_uri=request.application_url)
                    location = logout_endpoint + "?" + urlencode(qs)

    headers = forget(request)

    response = HTTPFound(location=location, headers=headers)

    # Cookie for loop prevention with default OAuth
    if oaserver and oaserver.options["default"]:
        response.set_cookie("ngw-oauth-logout", max_age=600, httponly=True)

    return response


def _login_url(request):
    """Request method for getting preferred login url (local or OAuth)"""

    auth = request.env.auth

    login_qs = dict()
    if request.matched_route is None or request.matched_route.name not in (
        auth.options["login_route_name"],
        auth.options["logout_route_name"],
    ):
        login_qs["next"] = request.url

    oauth_opts = auth.options.with_prefix("oauth")
    if oauth_opts["enabled"] and oauth_opts["default"] and oauth_opts["server.authorization_code"]:
        login_url = request.route_url("auth.oauth", _query=login_qs)
    else:
        login_url = request.route_url(auth.options["login_route_name"], _query=login_qs)

    return login_url


def forbidden_error_handler(request, err_info, exc, exc_info, **kwargs):
    oaserver = request.env.auth.oauth

    # If user is not authentificated, we can offer him to sign in
    if (
        request.method == "GET"
        and not request.is_api
        and not request.is_xhr
        and err_info.http_status_code == 403
        and request.authenticated_userid is None
    ):
        if oaserver and oaserver.options["default"]:
            if "ngw-oauth-logout" in request.cookies:
                # Loop prevention, bypass the handler
                return
            else:
                return HTTPFound(
                    location=request.route_path("auth.oauth", _query=dict(next=request.path_qs))
                )
        else:
            response = render_to_response(
                "nextgisweb:auth/template/login.mako",
                dict(
                    custom_layout=True,
                    props=dict(reloadAfterLogin=True),
                ),
                request=request,
            )
            response.status = 403
            return response


@viewargs(renderer="react")
def settings(request):
    if request.user.keyname == "guest":
        return HTTPUnauthorized()

    return dict(title=_("User settings"), entrypoint="@nextgisweb/auth/settings-form")


@viewargs(renderer="react")
def user_browse(request):
    request.user.require_permission(any, *permission.auth)
    return dict(
        title=_("Users"),
        entrypoint="@nextgisweb/auth/user-browse",
        props=dict(readonly=not request.user.has_permission(permission.manage)),
        dynmenu=request.env.pyramid.control_panel,
    )


@viewargs(renderer="react")
def user_create_or_edit(request):
    result = dict(
        entrypoint="@nextgisweb/auth/user-widget",
        dynmenu=request.env.pyramid.control_panel,
    )

    if "id" not in request.matchdict:
        request.user.require_permission(permission.manage)
        result["title"] = _("Create new user")
    else:
        request.user.require_permission(any, *permission.auth)
        try:
            obj = User.filter_by(**request.matchdict).one()
        except NoResultFound:
            raise HTTPNotFound()
        readonly = not request.user.has_permission(permission.manage)
        result["props"] = dict(id=obj.id, readonly=readonly)
        result["title"] = obj.display_name

    return result


@viewargs(renderer="react")
def group_browse(request):
    request.user.require_permission(any, *permission.auth)
    return dict(
        title=_("Groups"),
        entrypoint="@nextgisweb/auth/group-browse",
        props=dict(readonly=not request.user.has_permission(permission.manage)),
        dynmenu=request.env.pyramid.control_panel,
    )


@viewargs(renderer="react")
def group_create_or_edit(request):
    result = dict(
        entrypoint="@nextgisweb/auth/group-widget",
        dynmenu=request.env.pyramid.control_panel,
    )

    if "id" not in request.matchdict:
        request.user.require_permission(permission.manage)
        result["title"] = _("Create new group")
    else:
        request.user.require_permission(any, *permission.auth)
        try:
            obj = Group.filter_by(**request.matchdict).one()
        except NoResultFound:
            raise HTTPNotFound()
        readonly = not request.user.has_permission(permission.manage)
        result["props"] = dict(id=obj.id, readonly=readonly)
        result["title"] = obj.display_name

    return result


def setup_pyramid(comp, config):
    # Add it before default pyramid handlers
    comp.env.pyramid.error_handlers.insert(0, forbidden_error_handler)

    config.add_route("auth.login", "/login", get=login)
    config.add_route("auth.session_invite", "/session-invite").add_view(session_invite)
    config.add_route("auth.alink", "/alink/{token:str}").add_view(alink)
    config.add_route("auth.oauth", "/oauth").add_view(oauth)
    config.add_route("auth.logout", "/logout", get=logout)
    config.add_route("auth.settings", "/settings").add_view(settings)

    config.add_request_method(_login_url, name="login_url")

    config.add_route("auth.user.browse", "/auth/user/").add_view(user_browse)
    config.add_route("auth.user.create", "/auth/user/create").add_view(user_create_or_edit)
    config.add_route("auth.user.edit", "/auth/user/{id:uint}").add_view(user_create_or_edit)

    config.add_route("auth.group.browse", "/auth/group/").add_view(group_browse)
    config.add_route("auth.group.create", "/auth/group/create").add_view(group_create_or_edit)
    config.add_route("auth.group.edit", "/auth/group/{id:uint}").add_view(group_create_or_edit)

    @comp.env.pyramid.control_panel.add
    def _control_panel(args):
        user = args.request.user
        if user.has_permission(any, *permission.auth):
            yield dm.Label("auth", _("Groups and users"))

            yield dm.Link(
                "auth/user",
                _("Users"),
                lambda kwargs: kwargs.request.route_url("auth.user.browse"),
            )

            yield dm.Link(
                "auth/group",
                _("Groups"),
                lambda kwargs: kwargs.request.route_url("auth.group.browse"),
            )

    # Login and logout routes names
    def add_globals(event):
        event["login_route_name"] = comp.options["login_route_name"]
        event["logout_route_name"] = comp.options["logout_route_name"]

    config.add_subscriber(add_globals, BeforeRender)
