from collections.abc import Iterator
from datetime import timedelta
from urllib.parse import urlencode, urlparse

import sqlalchemy as sa
import transaction
from pyramid.httpexceptions import HTTPForbidden
from sqlalchemy.exc import NoResultFound
from sqlalchemy.orm import defer, undefer

from nextgisweb.env import Component, DBSession, gettext, gettextf, inject
from nextgisweb.lib.config import Option, OptionAnnotations
from nextgisweb.lib.datetime import utcnow_naive

from nextgisweb.core import CoreComponent
from nextgisweb.core.exception import ValidationError
from nextgisweb.pyramid import Session, SessionStore
from nextgisweb.pyramid.util import gensecret

from .exception import UserDisabledException
from .model import Group, User
from .oauth import OAuthHelper
from .policy import AP_INVITE, AuthMethod, AuthState, SecurityPolicy


class AuthComponent(Component):
    def initialize(self):
        super().initialize()
        self.oauth = (
            OAuthHelper(self.options.with_prefix("oauth"))
            if self.options["oauth.enabled"]
            else None
        )
        self._auth_methods = list[AuthMethod]()

    @inject()
    def initialize_db(self, *, core: CoreComponent = inject.arg()):
        tr = core.localizer().translate
        for keyname, display_name in User.system_display_name.items():
            self.initialize_user(keyname, tr(display_name), system=True)

        adm_opts = self.options.with_prefix("provision.administrator")
        adm_kw = dict(
            system=False,
            password=adm_opts["password"],
            oauth_subject=adm_opts["oauth_subject"],
        )
        if adm_kw["password"] is None and adm_kw["oauth_subject"] is None:
            adm_kw["password"] = "admin"
        admin = self.initialize_user(
            "administrator",
            tr(gettext("Administrator")),
            **adm_kw,
        )

        self.initialize_group(
            "administrators",
            tr(Group.system_display_name["administrators"]),
            system=True,
            members=[admin],
        )

    def auth_methods(self) -> Iterator[AuthMethod]:
        return reversed(self._auth_methods)

    def register_auth_method(self, m: AuthMethod):
        assert m not in self._auth_methods
        self._auth_methods.append(m)

    def unregister_auth_method(self, m: AuthMethod):
        self._auth_methods.remove(m)

    def setup_pyramid(self, config):
        from nextgisweb.auth import sync_ulg_cookie
        from nextgisweb.pyramid.tomb import Request

        def user(request: Request):
            environ = request.environ
            cached = environ.get("auth.user_obj")

            # Check that the cached value is in the current DBSession (and
            # therefore can load fields from DB).
            if cached is not None and cached in DBSession:
                return cached

            # Username, password and token are validated here.
            user_id = request.authenticated_userid

            user = (
                DBSession.query(User)
                .filter(
                    (User.id == user_id) if user_id is not None else (User.keyname == "guest"),
                )
                .options(
                    undefer(User.is_administrator),
                    defer(User.description),
                    defer(User.password_hash),
                    defer(User.oauth_tstamp),
                )
                .one()
            )

            if user.disabled:
                raise UserDisabledException()

            # Update last_activity if more than activity_delta time passed, but
            # only once per request.
            if cached is None:
                # Make locals in order to avoid SA session expiration issues
                user_id, user_la = user.id, user.last_activity

                delta = self.options["activity_delta"]
                if (
                    user_la is None or (utcnow_naive() - user_la) > delta
                ) and not request.session.get("invite", False):

                    def update_last_activity(request: Request):
                        with transaction.manager:
                            DBSession.query(User).filter_by(
                                principal_id=user_id,
                                last_activity=user_la,
                            ).update(dict(last_activity=utcnow_naive()))

                    request.add_finished_callback(update_last_activity)

            # Store essential user details request's environ
            environ["auth.user_obj"] = user
            environ["auth.user"] = dict(
                id=user.id,
                keyname=user.keyname,
                display_name=user.display_name,
                is_administrator=user.is_administrator,
                oauth_subject=user.oauth_subject,
                language=user.language,
            )

            sync_ulg_cookie(request, user=user)
            return user

        def require_administrator(request: Request):
            if not request.user.is_administrator:
                raise HTTPForbidden(explanation="Membership in group 'administrators' required!")

        def require_authenticated(request: Request):
            if request.authenticated_userid is None:
                raise HTTPForbidden(explanation="Authentication required!")

        config.add_request_method(user, property=True)
        config.add_request_method(require_administrator)
        config.add_request_method(require_authenticated)

        config.set_security_policy(SecurityPolicy(self, self.options.with_prefix("policy")))

        from . import api, view

        view.setup_pyramid(self, config)
        api.setup_pyramid(self, config)

    def initialize_user(self, keyname, display_name, *, system, **kwargs):
        """Checks is user with keyname exists in DB and
        if not, creates it with kwargs parameters"""

        try:
            obj = User.filter_by(keyname=keyname).one()
            if system:
                obj.display_name = display_name
        except NoResultFound:
            obj = User(
                keyname=keyname,
                display_name=display_name,
                system=system,
                **kwargs,
            ).persist()

        return obj

    def initialize_group(self, keyname, display_name, *, system, **kwargs):
        """Checks is usergroup with keyname exists in DB and
        if not, creates it with kwargs parameters"""

        try:
            obj = Group.filter_by(keyname=keyname).one()
            if system:
                obj.display_name = display_name
        except NoResultFound:
            obj = Group(
                keyname=keyname,
                display_name=display_name,
                system=system,
                **kwargs,
            ).persist()

        return obj

    def session_invite(self, keyname, url):
        user = User.filter_by(keyname=keyname, disabled=False).one_or_none()
        if user is None:
            group = Group.filter_by(keyname=keyname).one_or_none()
            if group is None:
                raise RuntimeError(f"No enabled user or group found for keyname '{keyname}'")
            for user in group.members:
                if not user.disabled:
                    break
            else:
                raise RuntimeError(f"Unable to find an enabled member of '{keyname}' group")

        result = urlparse(url)

        sid = gensecret(32)
        now = utcnow_naive()
        expires = (now + timedelta(minutes=30)).replace(microsecond=0)

        state = AuthState(AP_INVITE, user.id, int(expires.timestamp()), 0)

        Session(id=sid, created=now, last_activity=now).persist()
        SessionStore(session_id=sid, key="auth.state", value=state.to_dict()).persist()

        query = dict(sid=sid, expires=expires.isoformat())
        if len(result.path) > 0 and result.path != "/":
            query["next"] = result.path

        url = result.scheme + "://" + result.netloc + "/session-invite?" + urlencode(query)
        return url

    def check_user_limit(self, *, add=None):
        if (limit := self.options["user_limit"]) is not None:
            uc = _ucnt()
            if add is not None:
                uc += add

            if uc > limit:
                raise ValidationError(
                    message=gettext(
                        "Maximum number of users is reached. Your current plan user number limit is %d."
                    )
                    % limit
                )

    def check_user_limit_local(self):
        if (limit := self.options["user_limit_local"]) is not None:
            fc = [User.password_hash.is_not(None)]
            uc_local = _ucnt(*fc)

            if uc_local > limit:
                raise ValidationError(
                    message=gettextf(
                        "Maximum number of local users is reached. Your current plan local user number limit is {}."
                    ).format(limit)
                )

    # fmt: off
    option_annotations = OptionAnnotations((
        Option("alink", bool, default=False, doc="Allow authentication via link."),

        Option("login_route_name", default="auth.login"),
        Option("logout_route_name", default="auth.logout"),

        Option("activity_delta", timedelta, default=timedelta(minutes=10), doc="User last activity update time delta."),

        Option("user_limit", int, default=None, doc="Limit of enabled users."),
        Option("user_limit_local", int, default=None, doc="Limit of enabled local users."),

        Option("provision.administrator.password", str, default=None),
        Option("provision.administrator.oauth_subject", str, default=None),
    ))
    # fmt: on

    option_annotations += OAuthHelper.option_annotations.with_prefix("oauth")
    option_annotations += SecurityPolicy.option_annotations.with_prefix("policy")


def _ucnt(*fc, agg=sa.func.count):
    return DBSession.query(agg(User.id)).filter(~User.system, ~User.disabled, *fc).scalar()


def _ula(*fc, agg=sa.func.max):
    return DBSession.query(agg(User.last_activity)).filter(*fc).scalar()
