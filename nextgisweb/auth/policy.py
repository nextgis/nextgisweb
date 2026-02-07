from base64 import b64decode
from contextlib import contextmanager
from datetime import datetime, timedelta
from typing import TYPE_CHECKING, NewType, Protocol

import sqlalchemy as sa
from msgspec import Struct, convert, to_builtins
from pyramid.authorization import ACLHelper
from pyramid.interfaces import ISecurityPolicy
from pyramid.request import Request
from sqlalchemy.exc import NoResultFound
from sqlalchemy.orm import load_only
from zope.event import notify
from zope.interface import implementer

from nextgisweb.env import DBSession
from nextgisweb.lib.apitype import declare_enum
from nextgisweb.lib.config import Option, OptionAnnotations
from nextgisweb.lib.logging import logger

from nextgisweb.pyramid import SessionStore, WebSession

from .exception import (
    InvalidAuthorizationHeader,
    InvalidCredentialsException,
    SessionAuthenticationRequired,
    UserDisabledException,
)
from .model import User
from .oauth import (
    OAuthAccessTokenExpiredException,
    OAuthATokenRefreshException,
    OAuthGrantResponse,
)
from .util import current_tstamp
from .util import log_lazy_data as lf

AuthProvider = NewType("AuthProvider", str)
AuthMedium = NewType("AuthMedium", str)
if TYPE_CHECKING:

    def make_auth_provider(value: str) -> AuthProvider: ...
    def make_auth_medium(value: str) -> AuthMedium: ...
else:
    AuthProvider, make_auth_provider = declare_enum(AuthProvider)
    AuthMedium, make_auth_medium = declare_enum(AuthMedium)

AP_LOCAL_PW = make_auth_provider("local_pw")
AP_OAUTH_AC = make_auth_provider("oauth_ac")
AP_OAUTH_PW = make_auth_provider("oauth_pw")
AP_INVITE = make_auth_provider("invite")

AM_SESSION = make_auth_medium("session")
AM_BASIC = make_auth_medium("basic")
AM_BEARER = make_auth_medium("bearer")


class AuthState(Struct, omit_defaults=True):
    prv: AuthProvider
    uid: int
    exp: int
    ref: int | None = None

    @classmethod
    def from_dict(cls, data):
        return convert(data, cls)

    def to_dict(self):
        return to_builtins(self)


class AuthResult(Struct):
    uid: int
    med: AuthMedium
    prv: AuthProvider


class OnUserLogin(Struct):
    user: User
    request: Request
    next_url: str


class AuthMethod(Protocol):
    def __call__(self, request: Request, *, now: int) -> AuthResult | None: ...


@implementer(ISecurityPolicy)
class SecurityPolicy:
    def __init__(self, comp, options):
        self.comp = comp
        self.options = options
        self.test_user = None
        self.acl_helper = ACLHelper()
        self.refresh_session = False

    @property
    def oauth(self):
        return self.comp.oauth

    # ISecurityPolicy implementation

    def authenticated_userid(self, request):
        if aresult := self._authenticate_request(request):
            request.environ["auth.result"] = aresult
            return aresult.uid
        return None

    def remember(self, request, what, **kw):
        session = request.session

        user_id, tpair = what
        assert user_id is not None

        if tpair is None:
            prv = AP_LOCAL_PW
            now = current_tstamp()
            exp = int(now + self.options["local.lifetime"].total_seconds())
            ref = int(now + self.options["local.refresh"].total_seconds())
        else:
            exp = tpair.access_exp
            ref = None
            if tpair.grant_type == "authorization_code":
                prv = AP_OAUTH_AC
            elif tpair.grant_type == "password":
                prv = AP_OAUTH_PW
            else:
                raise ValueError

        state = AuthState(prv, user_id, exp, ref)
        session["auth.state"] = state.to_dict()

        if tpair:
            for k in ("access_token", "refresh_token"):
                sk = f"auth.{k}"
                v = getattr(tpair, k)
                assert v is not None
                session[sk] = v

        return ()

    def forget(self, request, **kw):
        def forget_callback(request, response):
            cookie_name = request.env.pyramid.options["session.cookie.name"]
            cs = WebSession.cookie_settings(request)
            response.delete_cookie(cookie_name, path=cs["path"], domain=cs["domain"])
            response.delete_cookie("ngw_ulg", path=cs["path"], domain=cs["domain"])

        request.add_response_callback(forget_callback)
        return ()

    def permits(self, request, context, permission):
        return self.acl_helper.permits(context, [], permission)

    # Addons

    def login(self, username, password, *, request):
        user, _, tpair = self._validate_credentials(username, password, return_tpair=True)

        if user.id is None:
            DBSession.flush()

        event = OnUserLogin(user, request, None)
        notify(event)

        headers = self.remember(request, (user.id, tpair))
        return user, headers, event

    def forget_user(self, user_id, request):
        SessionStore.filter(
            SessionStore.session_id != request.session.id,
            SessionStore.key == "auth.state",
            SessionStore.value.op("->>")("uid").cast(sa.Integer) == user_id,
        ).delete(synchronize_session=False)

    @contextmanager
    def refresh_session_context(self, value: bool):
        memo = self.refresh_session
        try:
            self.refresh_session = value
            yield
        finally:
            self.refresh_session = memo

    # Internals

    def _authenticate_request(self, request):
        now = current_tstamp()

        # TODO:  Try headers first!
        for m in (*self.comp.auth_methods(), self._try_session, self._try_headers):
            result = m(request, now=now)
            if result is not None:
                return result

    def _try_session(self, request, *, now):
        session = request.session
        if (state_dict := session.get("auth.state")) is None:
            if self.refresh_session:
                raise SessionAuthenticationRequired
            return

        state = AuthState.from_dict(state_dict)

        if state.prv in (AP_OAUTH_AC, AP_OAUTH_PW):
            if state.exp <= now or self.refresh_session:
                # To avoid issues with concurrent token refreshes, particularly
                # with NextGIS ID On-Premise, we implement a lock and adjust the
                # session keys.

                session_id = request.session.id
                with request.env.core.engine.connect() as con, con.begin():
                    con.execute(
                        sa.text("SELECT pg_advisory_xact_lock(hashtext((:sid)::text))"),
                        dict(sid=f"auth_oauth_{session_id}"),
                    )

                    # Another worker may have already refreshed it, so a
                    # double-check is necessary.
                    access_token_double_check = con.execute(
                        sa.select(SessionStore.value).filter_by(
                            session_id=session_id,
                            key="auth.access_token",
                        )
                    ).scalar()

                    if session["auth.access_token"] != access_token_double_check:
                        refresh_success = True
                    else:
                        try:
                            tpair = self.oauth.grant_type_refresh_token(
                                refresh_token=session["auth.refresh_token"],
                                access_token=session["auth.access_token"],
                            )

                            state.exp = tpair.access_exp
                            con.execute(
                                sa.update(SessionStore)
                                .values(value=sa.bindparam("v"))
                                .filter_by(session_id=session_id, key=sa.bindparam("k")),
                                [
                                    dict(k="auth.state", v=state.to_dict()),
                                    dict(k="auth.access_token", v=tpair.access_token),
                                    dict(k="auth.refresh_token", v=tpair.refresh_token),
                                ],
                            )
                        except OAuthATokenRefreshException:
                            refresh_success = False
                        else:
                            refresh_success = True

                # FIXME: Prevent overwriting new session keys by ensuring they
                # are not replaced in the session.
                for k in ("auth.state", "auth.access_token", "auth.refresh_token"):
                    try:
                        session._updated.remove(k)
                    except ValueError:
                        pass

                if not refresh_success:
                    self.forget(request)
                    return None

            return AuthResult(state.uid, AM_SESSION, state.prv)

        elif state.prv in (AP_LOCAL_PW, AP_INVITE):
            if state.exp <= now:
                return None

            if state.ref <= now or self.refresh_session:
                state.exp = now + int(self.options["local.lifetime"].total_seconds())
                state.ref = now + int(self.options["local.refresh"].total_seconds())
                session["auth.state"] = state.to_dict()

            return AuthResult(state.uid, AM_SESSION, state.prv)

        raise ValueError("Invalid authentication source")

    def _try_headers(self, request, *, now):
        ahead = request.headers.get("Authorization")
        if ahead is None:
            return None

        try:
            amode, value = ahead.split(" ", maxsplit=1)
        except ValueError:
            raise InvalidAuthorizationHeader()
        amode = amode.lower()

        if amode == "basic":
            try:
                decoded = b64decode(value).decode("utf-8")
                username, password = decoded.split(":", maxsplit=1)
            except ValueError:
                raise InvalidAuthorizationHeader()

            user, prv, _ = self._validate_credentials(username, password)
            if user.id is None:
                DBSession.flush()
            return AuthResult(user.id, AM_BASIC, prv)

        elif amode == "bearer" and self.oauth is not None:
            atoken = self.oauth.query_introspection(value)
            if atoken is not None:
                if atoken.exp < now:
                    logger.debug("OAuthAToken(%s): expired bearer token", lf(atoken.id))
                    raise OAuthAccessTokenExpiredException()

                user = self.oauth.access_token_to_user(atoken, access_token=value)
                if user.id is None:
                    DBSession.flush()

                return AuthResult(user.id, AM_BEARER, AP_OAUTH_AC)

        raise InvalidCredentialsException()

    def _validate_credentials(self, username, password, *, return_tpair=False):
        user = None
        prv = None
        tpair = None

        # Step 1: Authentication with local credentials

        q = User.filter(sa.func.lower(User.keyname) == username.lower()).options(
            load_only(User.password_hash, User.disabled)
        )

        if self.oauth and not self.oauth.local_auth:
            q = q.filter_by(oauth_subject=None)

        try:
            test_user = q.one()
        except NoResultFound:
            pass
        else:
            if test_user.password is not None and test_user.password == password:
                if test_user.disabled:
                    raise UserDisabledException()
                user = test_user
                prv = AP_LOCAL_PW

        # Step 2: Authentication with OAuth password if enabled

        if user is None and self.oauth is not None and self.oauth.password:
            ptoken, atoken = self.oauth.authorize_credentials(
                username, password, return_tpair=return_tpair
            )

            if ptoken is not None:
                # An atoken may or may not be loaded by authorize_credentials,
                # so do lazy atoken introspection. If it wasn't fetched by
                # authorize_credentials, it will be fetched as needed.
                def _get_atoken():
                    nonlocal atoken
                    if atoken is None:
                        atoken = self.oauth.query_introspection(ptoken.access_token)
                    return atoken

                user = self.oauth.access_token_to_user(
                    atoken=_get_atoken,
                    from_existing=ptoken.user,
                    min_oauth_tstamp=datetime.fromtimestamp(ptoken.tstamp),
                    access_token=ptoken.access_token,
                )

                if ptoken.user is None:
                    ptoken.user = user

                prv = AP_OAUTH_PW

                if return_tpair:
                    tpair = OAuthGrantResponse(
                        grant_type="password",
                        access_token=ptoken.access_token,
                        access_exp=ptoken.access_exp,
                        refresh_token=ptoken.refresh_token,
                        refresh_exp=ptoken.refresh_exp,
                    )

        if user is None:
            raise InvalidCredentialsException()

        return (user, prv, tpair)

    # fmt: off
    option_annotations = OptionAnnotations((
        Option("local.lifetime", timedelta, default=timedelta(days=1), doc="Local authentication lifetime."),
        Option("local.refresh", timedelta, default=timedelta(hours=1), doc="Refresh local authentication lifetime interval."),
    ))
    # fmt: on
