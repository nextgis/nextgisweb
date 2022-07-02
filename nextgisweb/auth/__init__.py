import json
from datetime import datetime, timedelta
from urllib.parse import urlencode, urlparse

import transaction
from sqlalchemy.orm.exc import NoResultFound
from sqlalchemy.orm import defer
from pyramid.httpexceptions import HTTPForbidden, HTTPUnauthorized
from pyramid.interfaces import ISecurityPolicy

from ..lib.config import OptionAnnotations, Option
from ..lib.logging import logger
from ..component import Component
from ..core.exception import ValidationError
from ..models import DBSession
from ..pyramid import Session, SessionStore
from ..pyramid.util import gensecret
from .. import db

from .model import Base, Principal, User, Group, OnFindReferencesData
from .exception import UserDisabledException
from .policy import SecurityPolicy
from .oauth import OAuthHelper, OAuthPasswordToken, OAuthToken, OnAccessTokenToUser
from .util import _
from .api import OnUserLogin
from . import command  # NOQA

__all__ = [
    'Principal', 'User', 'Group', 'OnAccessTokenToUser',
    'OnFindReferencesData', 'OnUserLogin']


class AuthComponent(Component):
    identity = 'auth'
    metadata = Base.metadata

    def initialize(self):
        super().initialize()
        self.settings_register = self.options['register']
        self.oauth = OAuthHelper(self.options.with_prefix('oauth')) \
            if self.options['oauth.enabled'] else None

    def initialize_db(self):
        self.initialize_user(
            keyname='guest',
            system=True,
            display_name=_("Guest")
        )

        self.initialize_user(
            keyname='everyone',
            system=True,
            display_name=_("Everyone")
        ).persist()

        self.initialize_user(
            keyname='authenticated',
            system=True,
            display_name=_("Authenticated")
        ).persist()

        adm_opts = self.options.with_prefix('provision.administrator')

        self.initialize_group(
            keyname='administrators',
            system=True,
            display_name=_("Administrators"),
            members=[self.initialize_user(
                keyname='administrator',
                display_name=_("Administrator"),
                password=adm_opts['password'],
                oauth_subject=adm_opts['oauth_subject'],
            ), ]
        ).persist()

        self.initialize_user(
            system=True,
            keyname='owner',
            display_name=_("Owner")
        ).persist()

    def setup_pyramid(self, config):

        def user(request):
            environ = request.environ
            cached = environ.get('auth.user_obj')

            # Check that the cached value is in the current DBSession (and
            # therefore can load fields from DB).
            if cached is not None and cached in DBSession:
                return cached

            # Username, password and token are validated here.
            user_id = request.authenticated_userid

            user = DBSession.query(User).filter(
                (User.id == user_id) if user_id is not None
                else (User.keyname == 'guest'),
            ).options(
                defer(User.description),
                defer(User.password_hash),
                defer(User.oauth_subject),
                defer(User.oauth_tstamp),
            ).one()

            if user.disabled:
                raise UserDisabledException()

            # Update last_activity if more than activity_delta time passed, but
            # only once per request.
            if cached is None:
                # Make locals in order to avoid SA session expiration issues
                user_id, user_la = user.id, user.last_activity

                delta = self.options['activity_delta']
                if (
                    (user_la is None or (datetime.utcnow() - user_la) > delta)
                    and not request.session.get('invite', False)
                ):

                    def update_last_activity(request):
                        with transaction.manager:
                            DBSession.query(User).filter_by(
                                principal_id=user_id,
                                last_activity=user_la,
                            ).update(dict(last_activity=datetime.utcnow()))

                    request.add_finished_callback(update_last_activity)

            # Store essential user details request's environ
            environ['auth.user'] = dict(
                id=user.id, keyname=user.keyname,
                display_name=user.display_name,
                language=user.language)

            environ['auth.user_obj'] = user
            return user

        def require_administrator(request):
            if not request.user.is_administrator:
                raise HTTPForbidden(
                    explanation="Membership in group 'administrators' required!")

        def require_authenticated(request):
            if request.authenticated_userid is None:
                raise HTTPForbidden(
                    explanation="Authentication required!")

        config.add_request_method(user, property=True)
        config.add_request_method(require_administrator)
        config.add_request_method(require_authenticated)

        config.set_security_policy(SecurityPolicy(
            self, self.options.with_prefix('policy')))

        from . import view, api
        view.setup_pyramid(self, config)
        api.setup_pyramid(self, config)

    def client_settings(self, request):
        enabled = (self.oauth is not None) and self.oauth.authorization_code
        return dict(
            oauth=dict(
                enabled=enabled,
                default=self.oauth.options['default'] if enabled else None,
                bind=self.oauth.options['bind'] if enabled else None,
                display_name=self.oauth.options['server.display_name'] if enabled else None,
            )
        )

    def query_stat(self):
        def ucnt(*fc, agg=db.func.count):
            return DBSession.query(agg(User.id)).filter(
                ~User.system, ~User.disabled, *fc).scalar()

        def ula(*fc, agg=db.func.max):
            return DBSession.query(agg(User.last_activity)).filter(
                *fc).scalar()

        return dict(
            user_count=ucnt(),
            oauth_count=ucnt(User.oauth_subject.is_not(None)),
            last_activity=dict(
                everyone=ula(),
                authenticated=ula(User.keyname != 'guest'),
                administrator=ula(User.member_of.any(keyname='administrators')),
            )
        )

    def initialize_user(self, keyname, display_name, **kwargs):
        """ Checks is user with keyname exists in DB and
        if not, creates it with kwargs parameters """

        try:
            obj = User.filter_by(keyname=keyname).one()
        except NoResultFound:
            obj = User(
                keyname=keyname,
                display_name=translate(self, display_name),
                **kwargs).persist()

        return obj

    def initialize_group(self, keyname, display_name, **kwargs):
        """ Checks is usergroup with keyname exists in DB and
        if not, creates it with kwargs parameters """

        try:
            obj = Group.filter_by(keyname=keyname).one()
        except NoResultFound:
            obj = Group(
                keyname=keyname,
                display_name=translate(self, display_name),
                **kwargs).persist()

        return obj

    def authenticate(self, request, login, password):
        auth_policy = request.registry.getUtility(ISecurityPolicy)
        user, tresp = auth_policy.authenticate_with_password(
            username=login, password=password)

        headers = auth_policy.remember(request, (user.id, tresp))

        return user, headers

    def session_invite(self, keyname, url):
        user = User.filter_by(keyname=keyname).one_or_none()
        if user is None:
            group = Group.filter_by(keyname=keyname).one_or_none()
            if group is None:
                raise RuntimeError(f"No user or group found for keyname '{keyname}'")
            for user in group.members:
                if not user.disabled:
                    break
            else:
                raise RuntimeError(f"Unable to find an enabled member of '{keyname}' group")

        result = urlparse(url)

        sid = gensecret(32)
        utcnow = datetime.utcnow()
        lifetime = timedelta(minutes=30)
        expires = (utcnow + lifetime).replace(microsecond=0)

        session_expires = int(expires.timestamp())

        options = self.env.auth.options.with_prefix('policy.local')
        half_life = timedelta(seconds=int(lifetime.total_seconds()) / 2)
        refresh = min(half_life, options['refresh'])
        session_refresh = int((utcnow + refresh).timestamp())

        current = ['LOCAL', user.id, session_expires, session_refresh]

        with transaction.manager:
            Session(id=sid, created=utcnow, last_activity=utcnow).persist()
            for k, v in (
                ('auth.policy.current', current),
                ('invite', True),
            ):
                SessionStore(session_id=sid, key=k, value=json.dumps(v)).persist()

        query = dict(sid=sid, expires=expires.isoformat())
        if (len(result.path) > 0 and result.path != '/'):
            query['next'] = result.path

        url = result.scheme + '://' + result.netloc + '/session-invite?' + urlencode(query)
        return url

    def check_user_limit(self, exclude_id=None):
        user_limit = self.options['user_limit']
        if user_limit is not None:
            query = DBSession.query(db.func.count(User.id)).filter(
                db.and_(db.not_(User.system), db.not_(User.disabled)))
            if exclude_id is not None:
                query = query.filter(User.id != exclude_id)

            with DBSession.no_autoflush:
                active_user_count = query.scalar()

            if active_user_count >= user_limit:
                raise ValidationError(message=_(
                    "Maximum number of users is reached. Your current plan user number limit is %d."
                ) % user_limit)

    def maintenance(self):
        with transaction.manager:
            # Add additional minute for clock skew
            exp = datetime.utcnow() + timedelta(seconds=60)
            logger.debug("Cleaning up expired OAuth tokens (exp < %s)", exp)

            rows = OAuthToken.filter(OAuthToken.exp < exp).delete()
            logger.info("Expired cached OAuth tokens data deleted: %d", rows)

            rows = OAuthPasswordToken.filter(OAuthPasswordToken.refresh_exp < exp).delete()
            logger.info("Expired cached OAuth password tokens deleted: %d", rows)

    def backup_configure(self, config):
        super().backup_configure(config)
        config.exclude_table_data('public', OAuthToken.__tablename__)
        config.exclude_table_data('public', OAuthPasswordToken.__tablename__)

    option_annotations = OptionAnnotations((
        Option('register', bool, default=False,
               doc="Allow user registration."),

        Option('login_route_name', default='auth.login',
               doc="Name of route for login page."),

        Option('logout_route_name', default='auth.logout',
               doc="Name of route for logout page."),

        Option('activity_delta', timedelta, default=timedelta(minutes=10),
               doc="User last activity update time delta."),

        Option('user_limit', int, default=None, doc="Limit of enabled users"),

        Option('provision.administrator.password', str, default='admin'),
        Option('provision.administrator.oauth_subject', str, default=None),
    ))

    option_annotations += OAuthHelper.option_annotations.with_prefix('oauth')
    option_annotations += SecurityPolicy.option_annotations.with_prefix('policy')


def translate(self, trstring):
    return self.env.core.localizer().translate(trstring)
