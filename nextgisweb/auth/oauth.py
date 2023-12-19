import itertools
import re
from dataclasses import dataclass
from datetime import datetime, timedelta
from functools import lru_cache
from hashlib import sha512
from secrets import token_hex
from urllib.parse import urlencode

import requests
import sqlalchemy as sa
import zope.event
from passlib.hash import sha256_crypt
from requests.exceptions import InvalidJSONError
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.orm import defer, joinedload, load_only
from sqlalchemy.orm.exc import NoResultFound

from nextgisweb.env import DBSession, _, env
from nextgisweb.lib.config import Option, OptionAnnotations
from nextgisweb.lib.logging import lazy_str, logger

from nextgisweb.core.exception import UserException

from .exception import UserDisabledException
from .model import Group, OAuthAToken, OAuthPToken, User
from .util import clean_user_keyname, current_tstamp, enum_name
from .util import log_lazy_data as lf

MAX_TOKEN_LENGTH = 250


class OAuthHelper:
    def __init__(self, options):
        self.options = options
        self._apply_server_type()

        self.authorization_code = options["server.authorization_code"]
        self.password = options["server.password"]
        self.local_auth = options["local_auth"]

        self.server_headers = {}
        if "server.authorization_header" in options:
            self.server_headers["Authorization"] = options["server.authorization_header"]

    def _apply_server_type(self):
        options = self.options

        stype = options["server.type"]
        if stype is None:
            return

        def _set(k, value):
            if k not in options:
                options[k] = value

        base_url = options["server.base_url"].rstrip("/")

        if stype == "nextgisid":
            oauth_url = f"{base_url}/oauth2"
            _set("server.display_name", "NextGIS ID")
            _set("server.token_endpoint", f"{oauth_url}/token/")
            _set("server.auth_endpoint", f"{oauth_url}/authorize/")
            _set("server.introspection_endpoint", f"{oauth_url}/introspect/")
            _set("profile.subject.attr", "sub")
            _set("profile.keyname.attr", "username")
            _set("profile.display_name.attr", "first_name, last_name")

        elif stype == "keycloak":
            oidc_url = f"{base_url}/protocol/openid-connect"
            _set("server.token_endpoint", f"{oidc_url}/token")
            _set("server.auth_endpoint", f"{oidc_url}/auth")
            _set("server.introspection_endpoint", f"{oidc_url}/token/introspect")
            _set("profile.subject.attr", "sub")
            _set("profile.keyname.attr", "preferred_username")
            _set("profile.display_name.attr", "name")
            _set("profile.member_of.attr", "resource_access.{client_id}.roles")

        elif stype == "blitz":
            tbase_url = f"{base_url}/blitz/oauth"
            _set("server.token_endpoint", f"{tbase_url}/te")
            _set("server.auth_endpoint", f"{tbase_url}/ae")
            _set("server.introspection_endpoint", f"{tbase_url}/introspect")
            _set("server.userinfo_endpoint", f"{tbase_url}/me")
            _set("profile.subject.attr", "sub")
            _set("profile.keyname.attr", "sub")
            _set("profile.display_name.attr", "given_name, family_name")
            _set("profile.member_of.attr", "groups.id")

        else:
            raise ValueError(f"Invalid value: {stype}")

    def authorization_code_url(self, redirect_uri, **kwargs):
        qs = dict(response_type="code", redirect_uri=redirect_uri, **kwargs)

        if client_id := self.options.get("client.id"):
            qs["client_id"] = client_id
        if scope := self.options.get("scope"):
            qs["scope"] = " ".join(scope)

        return self.options["server.auth_endpoint"] + "?" + urlencode(qs)

    def authorize_credentials(self, username, password, *, return_tpair=False):
        now = current_tstamp()

        client_id = self.options.get("client.id")
        ptoken_id = _password_token_hash_cache(username, password, client_id)

        atoken, tpair = None, None
        user = None

        try:
            attrs = [
                OAuthPToken.tstamp,
                OAuthPToken.access_exp,
                OAuthPToken.user_id,
            ] + (
                [
                    OAuthPToken.access_token,
                    OAuthPToken.refresh_token,
                    OAuthPToken.refresh_exp,
                ]
                if return_tpair
                else []
            )

            query = (
                DBSession.query(OAuthPToken)
                .options(
                    load_only(*attrs),
                )
                .where(OAuthPToken.id == ptoken_id)
                .options(
                    joinedload(OAuthPToken.user).options(
                        load_only(User.keyname, User.oauth_tstamp)
                    )
                )
            )

            ptoken = query.one()
            user = ptoken.user

            logger.debug(
                "OAuthPToken(%s): bound to User(id=%d, keyname=%s), %s",
                lf(ptoken_id),
                user.id,
                user.keyname,
                _lf_exp((ptoken, now)),
            )

        except NoResultFound:
            logger.debug("OAuthPToken(%s) not found", lf(ptoken_id))
            try:
                ptoken = OAuthPToken(id=ptoken_id)
                tpair = self.grant_type_password(username, password)
            except OAuthPasswordGrantTypeException:
                return (None, None)
        else:
            if ptoken.access_exp < now:
                if ptoken.refresh_exp > now:
                    logger.debug("OAuthPToken(%s): refreshing token pair", lf(ptoken_id))

                    if not return_tpair:
                        # There is no way to tell SA to load two columns
                        # simultaneously, so we load them manually.
                        access_token, refresh_token = DBSession.execute(
                            sa.select(
                                OAuthPToken.access_token,
                                OAuthPToken.refresh_token,
                            ).where(OAuthPToken.id == ptoken_id)
                        ).one()
                    else:
                        access_token = ptoken.access_token
                        refresh_token = ptoken.refresh_token

                    try:
                        tpair = self.grant_type_refresh_token(refresh_token, access_token)
                    except OAuthATokenRefreshException:
                        # Will try to obtain new tpair
                        # TODO: Add test case for that
                        pass

                if tpair is None:
                    logger.debug("OAuthPToken(%s): requesting new token pair", lf(ptoken_id))
                    try:
                        tpair = self.grant_type_password(username, password)
                    except OAuthPasswordGrantTypeException:
                        return (None, None)

        if tpair:
            ptoken.tstamp = now
            ptoken.access_token = tpair.access_token
            ptoken.access_exp = tpair.access_exp
            ptoken.refresh_token = tpair.refresh_token
            ptoken.refresh_exp = tpair.refresh_exp

            # We don't trust expires_in from the grant response
            atoken = self.query_introspection(tpair.access_token)
            ptoken.access_exp = atoken.exp

        ptoken.persist()
        return (ptoken, atoken)

    def grant_type_password(self, username, password):
        params = dict(username=username, password=password)
        if scope := self.options.get("scope"):
            params["scope"] = " ".join(scope)

        try:
            return self._token_request("password", params)
        except OAuthErrorResponse as exc:
            logger.warning("Password grant type failed: %s", exc.code)
            raise OAuthPasswordGrantTypeException()

    def grant_type_authorization_code(self, code, redirect_uri):
        return self._token_request(
            "authorization_code", dict(redirect_uri=redirect_uri, code=code)
        )

    def grant_type_refresh_token(self, refresh_token, access_token):
        try:
            return self._token_request(
                "refresh_token", dict(refresh_token=refresh_token, access_token=access_token)
            )
        except OAuthErrorResponse as exc:
            logger.warning("Token refresh failed: %s", exc.code)
            raise OAuthATokenRefreshException()

    def query_introspection(self, access_token):
        if len(access_token) > MAX_TOKEN_LENGTH:
            token_id = "sha512:" + sha512(access_token.encode("utf-8")).hexdigest()
        else:
            token_id = "raw:" + access_token

        with DBSession.no_autoflush:
            atoken = (
                OAuthAToken.filter_by(id=token_id)
                .options(
                    defer(OAuthAToken.data),
                )
                .first()
            )

        if atoken is not None:
            logger.debug("OAuthAToken(%s): read from cache", lf(access_token))
        else:
            try:
                tdata = self._server_request("introspection", dict(token=access_token))
            except OAuthErrorResponse as exc:
                logger.warning("Token verification failed: %s", exc.code)
                return None  # TODO: Use custom exception here instead of None

            if self.options.get("scope") is not None:
                token_scope = set(tdata["scope"].split(" ")) if "scope" in tdata else set()
                if not set(self.options["scope"]).issubset(token_scope):
                    raise InvalidScopeException()

            stmt = pg_insert(OAuthAToken).values(
                [
                    dict(
                        id=token_id,
                        exp=int(tdata["exp"]),
                        sub=str(tdata[self.options["profile.subject.attr"]]),
                        data=tdata,
                    )
                ]
            )
            stmt = stmt.on_conflict_do_update(
                index_elements=[OAuthAToken.id],
                set_=dict(exp=stmt.excluded.exp, sub=stmt.excluded.sub, data=stmt.excluded.data),
            ).returning(OAuthAToken)
            stmt = (
                sa.select(OAuthAToken)
                .from_statement(stmt)
                .execution_options(populate_existing=True)
            )

            with DBSession.no_autoflush:
                atoken = DBSession.execute(stmt).scalar()

            logger.debug("OAuthAToken(%s): adding to cache", lf(access_token))

        return atoken

    def access_token_to_user(
        self,
        atoken,
        *,
        bind_user=None,
        from_existing=None,
        min_oauth_tstamp=None,
        access_token=None,
    ):
        def _atoken():
            nonlocal atoken
            if callable(atoken):
                atoken = atoken()
            return atoken

        with DBSession.no_autoflush:
            user = (
                User.filter_by(oauth_subject=_atoken().sub)
                .options(
                    load_only(User.id, User.oauth_tstamp, User.oauth_subject),
                )
                .first()
                if from_existing is None
                else from_existing
            )

            if bind_user is not None:
                if user is not None and user.id != bind_user.id:
                    dn = self.options["server.display_name"]
                    raise AuthorizationException(
                        title=_("{} binding error").format(dn),
                        message=_(
                            "This {dn} account ({sub}) is already bound to "
                            "the different user ({id}). Log in using this "
                            "account instead of binding it."
                        ).format(dn=dn, sub=_atoken().sub, id=user.id),
                    )
                user = bind_user

            if user is None:
                # Register new user with default groups
                if self.options["register"]:
                    user = User(oauth_subject=_atoken().sub).persist()
                    env.auth.check_user_limit()
                    user.member_of = Group.filter_by(register=True).all()
                else:
                    return None
            elif user.disabled:
                raise UserDisabledException()

            if user.oauth_tstamp is not None and (
                (min_oauth_tstamp and user.oauth_tstamp > min_oauth_tstamp)
                or (user.oauth_tstamp + self.options["profile.sync_timedelta"]) > datetime.utcnow()
            ):
                return user  # Just skip profile synchronization
            elif bind_user is None:
                if user.id is not None:
                    logger.debug(
                        "User(id=%d, keyname=%s): updating from token", user.id, user.keyname
                    )
                self._update_user(user, _atoken().data, access_token=access_token)

            user.oauth_tstamp = datetime.utcnow()

            event = OnAccessTokenToUser(user, _atoken().data)
            zope.event.notify(event)

        return user

    def _server_request(self, endpoint, params, *, default_method="POST", access_token=None):
        url = self.options["server.{}_endpoint".format(endpoint)]
        method = self.options.get("server.{}_method".format(endpoint), default_method).lower()
        timeout = self.options["timeout"].total_seconds()

        params = dict(params)
        headers = dict(self.server_headers)
        authorization = None
        verify = not self.options["server.insecure"]

        log_reqid = token_hex(4)
        logger.debug("Request(%s): > %s %s", log_reqid, method.upper(), url)

        if access_token is None:
            if client_id := self.options.get("client.id"):
                params["client_id"] = client_id
            if client_secret := self.options.get("client.secret"):
                params["client_secret"] = client_secret
            authorization = (client_id, client_secret)
        else:
            headers["Authorization"] = f"Bearer {access_token}"
            logger.debug("Request(%s): Bearer %s", log_reqid, lf(access_token))

        logger.debug("Request(%s): > %s", log_reqid, lf(params))
        response = getattr(requests, method.lower())(
            url,
            params,
            headers=headers,
            timeout=timeout,
            auth=authorization,
            verify=verify,
        )

        logger.debug(
            "Request(%s): < %d %s; %d bytes; %s",
            log_reqid,
            response.status_code,
            response.reason,
            len(response.content),
            response.headers.get("content-type"),
        )

        try:
            result = response.json()
            logger.debug("Request(%s): < %s", log_reqid, lf(result))
        except InvalidJSONError:
            raise OAuthInvalidResponse("JSON decode error", response)

        if not (200 <= response.status_code <= 299):
            error = result.get("error")
            if error is None or not isinstance(error, str):
                raise OAuthInvalidResponse("Error key missing", response)
            raise OAuthErrorResponse(error)

        return result

    def _token_request(self, grant_type, params):
        data = self._server_request("token", dict(grant_type=grant_type, **params))
        now = current_tstamp()
        return OAuthGrantResponse(
            grant_type=grant_type,
            access_token=data["access_token"],
            access_exp=now + int(data["expires_in"]),
            refresh_token=data["refresh_token"],
            refresh_exp=now
            + int(
                data["refresh_expires_in"]
                if "refresh_expires_in" in data
                else self.options["server.refresh_expires_in"].total_seconds()
            ),
        )

    def _update_user(self, user, tdata, *, access_token=None):
        if self.options["server.userinfo_endpoint"]:
            tdata = self._server_request(
                "userinfo",
                dict(),
                default_method="GET",
                access_token=access_token,
            )

        opts = self.options.with_prefix("profile")

        if user.keyname is None or not opts["keyname.no_update"]:
            profile_keyname = opts.get("keyname.attr", None)
            if profile_keyname is not None:
                user.keyname = tdata[profile_keyname]

            # Check keyname/display_name uniqueness and add numbered suffix
            keyname_base = _fallback_value(user.keyname, user.oauth_subject)
            for idx in itertools.count():
                candidate = clean_user_keyname(keyname_base)
                candidate = enum_name(candidate, idx, sep="_")
                if (
                    User.filter(
                        sa.func.lower(User.keyname) == candidate.lower(), User.id != user.id
                    ).first()
                    is None
                ):
                    user.keyname = candidate
                    break

        if user.display_name is None or not opts["display_name.no_update"]:
            profile_display_name = opts.get("display_name.attr", None)
            if profile_display_name is not None:
                user.display_name = " ".join(
                    [tdata[key] for key in re.split(r",\s*", profile_display_name) if key in tdata]
                )

            display_name_base = _fallback_value(user.display_name, user.keyname)
            for idx in itertools.count():
                candidate = enum_name(display_name_base, idx, sep=" ")
                if (
                    User.filter(
                        sa.func.lower(User.display_name) == candidate.lower(), User.id != user.id
                    ).first()
                    is None
                ):
                    user.display_name = candidate
                    break

        # Group membership (member_of)
        if (mof_attr := opts["member_of.attr"]) is not None:
            mof_attr_sub = mof_attr.format(client_id=self.options["client.id"])
            try:
                mof = _member_of_from_token(tdata, mof_attr_sub)
            except ValueError:
                logger.warning("Can't get token groups for user '%s'.", user.keyname)
                mof = set()
            else:
                logger.debug(
                    "Token groups for user '%s': %s",
                    user.keyname,
                    ", ".join(f"'{m}'" for m in mof),
                )

            for group in list(user.member_of):
                if not group.oauth_mapping:
                    continue
                keyname = group.keyname.lower()
                if keyname in mof:
                    logger.debug("Keeping user '%s' in group '%s'.", user.keyname, keyname)
                    mof.remove(keyname)
                else:
                    logger.info("Removing user '%s' from group '%s'.", user.keyname, keyname)
                    user.member_of.remove(group)

            if len(mof) > 0:
                grp_add = Group.filter(
                    Group.oauth_mapping, sa.func.lower(Group.keyname).in_(mof)
                ).all()
                if len(grp_add) > 0:
                    logger.info(
                        "Adding user '%s' into groups: %s.",
                        user.keyname,
                        ", ".join(f"'{g.keyname}'" for g in grp_add),
                    )
                    user.member_of.extend(grp_add)
                if len(grp_add) != len(mof):
                    miss = mof.difference(set(g.keyname.lower() for g in grp_add))
                    logger.warning(
                        "Unmatched groups for user '%s': %s.",
                        user.keyname,
                        ", ".join(f"'{m}'" for m in miss),
                    )

    # fmt: off
    option_annotations = OptionAnnotations((
        Option("enabled", bool, default=False, doc="Enable OAuth authentication."),
        Option("default", bool, default=False, doc=(
            "Use OAuth authentication by default. Unauthenticated user viewing "
            "forbidden page will be redirected to OAuth server without showing "
            "login dialog. Login dialog will be available at /login URL.")),
        Option("register", bool, default=True, doc="Allow registering new users via OAuth."),
        Option("local_auth", bool, default=True, doc="Allow authentication with local password for OAuth users."),
        Option("bind", bool, default=True, doc="Allow binding local user to OAuth user."),
        Option("scope", list, default=None, doc="OAuth scopes"),

        Option("client.id", default=None, doc="OAuth client ID"),
        Option("client.secret", default=None, secure=True, doc="OAuth client secret"),

        Option("server.type", default=None, doc="OAuth server: nextgisid, keycloak or blitz (requires base URL)."),
        Option("server.base_url", doc=(
                "OAuth server base URL. For NextGIS ID - https://nextgisid, "
                "for Keycloak - https://keycloak/auth/realms/master.")),
        Option("server.display_name", default="OAuth"),
        Option("server.authorization_code", bool, default=True, doc="Use authorization code grant type."),
        Option("server.password", bool, default=False, doc="Use password grant type."),
        Option("server.token_endpoint", doc="OAuth token endpoint URL."),
        Option("server.token_method", default="POST", doc="Workaround for NGID OAuth implementation."),
        Option("server.introspection_endpoint", default=None, doc="OAuth token introspection endpoint URL."),
        Option("server.introspection_method", default="POST", doc="Workaround for NGID OAuth implementation."),
        Option("server.auth_endpoint", default=None, doc="OAuth authorization code endpoint URL."),
        Option("server.userinfo_endpoint", default=None, doc="OAuth user info endpoint URL."),
        Option("server.authorization_header", default=None, doc="Add Authorization HTTP header to requests to OAuth server."),
        Option("server.refresh_expires_in", timedelta, default=timedelta(days=7), doc=(
            "Default refresh token expiration (if not set by OAuth server).")),
        Option("server.logout_endpoint", default=None, doc="OAuth logout endpoint URL."),
        Option("server.insecure", bool, default=False, doc="Skip SSL certificates validaion."),
        Option("profile.endpoint", default=None, doc="OpenID Connect endpoint URL"),

        Option("profile.subject.attr", default="sub", doc="OAuth profile subject identifier"),
        Option("profile.keyname.attr", default="preferred_username", doc="OAuth profile keyname (user name)"),
        Option("profile.keyname.no_update", bool, default=False, doc="Turn off keyname secondary synchronization"),
        Option("profile.display_name.attr", default="name", doc="OAuth profile display name"),
        Option("profile.display_name.no_update", bool, default=False, doc="Turn off display_name secondary synchronization"),
        Option("profile.member_of.attr", default=None, doc=(
            "OAuth group attribute used for automatic group assignment. Users "
            "get membership in groups with keynames that match the values of "
            "the attribute and have OAuth mapping flag. Supports dots and "
            "{client_id} substitution (like 'resource_access.{client_id}.roles' "
            "for Keycloak integration).")),
        Option("profile.sync_timedelta", timedelta, default=timedelta(minutes=5), doc=(
            "Minimum time delta between profile synchronization with OAuth server.")),

        Option("timeout", timedelta, default=timedelta(seconds=15), doc="OAuth server request timeout."),
    ))
    # fmt: on


class OnAccessTokenToUser:
    def __init__(self, user, profile):
        self._user = user
        self._profile = profile

    @property
    def user(self):
        return self._user

    @property
    def profile(self):
        return self._profile


@dataclass
class OAuthGrantResponse:
    grant_type: str
    access_token: str
    access_exp: int
    refresh_token: str
    refresh_exp: int


@lru_cache(maxsize=256)
def _password_token_hash_cache(username, password, salt):
    # NOTE: If salt kwarg isn't provided, it'll be generated during startup.
    # Each proccess will have each own password hashes and pairs of tokens.

    # Setting rounds to 5000 removes the rounds number form hashed.
    return "".join(
        sha256_crypt.using(salt=salt[:16], rounds=5000)
        .hash(
            f"{username}:{password}",
        )
        .split("$")[-2:]
    ).replace(".", "")


class OAuthInvalidResponse(Exception):
    def __init__(self, message, response):
        ct = response.headers.get("content-type", "unknown")
        super().__init__(f'{message} (status: {response.status_code}; content-type: "{ct}")')


class OAuthErrorResponse(Exception):
    def __init__(self, code):
        super().__init__(f"Error code: {code}")
        self.code = code


class AuthorizationException(UserException):
    title = _("OAuth authorization error")
    http_status_code = 401


class InvalidTokenException(UserException):
    title = _("Invalid OAuth token")
    http_status_code = 401


class InvalidScopeException(UserException):
    title = _("Invalid OAuth scope")
    http_status_code = 401


class OAuthPasswordGrantTypeException(UserException):
    title = _("OAuth password grant type failed")
    http_status_code = 401


class OAuthATokenRefreshException(UserException):
    title = _("OAuth token refresh failed")
    http_status_code = 401


class OAuthAccessTokenExpiredException(UserException):
    title = _("OAuth access token is expired")
    http_status_code = 401


def _fallback_value(*args):
    for a in args:
        if not (a is None or (isinstance(a, str) and a.strip() == "")):
            return a
    raise ValueError("No suitable value found")


def _member_of_traverse(data, path):
    if len(path) == 0:
        if data is None:
            pass  # Skip nulls
        elif not isinstance(data, (int, str)):
            raise ValueError
        else:
            yield str(data)
    else:
        path = list(path)
        key = path.pop(0)
        value = data.get(key, None)

        if isinstance(value, list):
            for itm in value:
                yield from _member_of_traverse(itm, path)
        else:
            yield from _member_of_traverse(value, path)


def _member_of_from_token(tdata, key):
    return set(v.lower() for v in _member_of_traverse(tdata, key.split(".")))


@lazy_str
def _lf_exp(value):
    ptoken, now = value
    access_exp = ptoken.access_exp
    if access_exp >= now:
        return "expires in %ds" % (access_exp - now)
    else:
        return "expired %ds ago" % (now - access_exp)
