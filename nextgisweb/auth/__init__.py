import json
from datetime import datetime, timedelta
from urllib.parse import urlencode, urlparse

import transaction
from sqlalchemy.orm.exc import NoResultFound
from sqlalchemy.orm import defer
from sqlalchemy import select
from pyramid.httpexceptions import HTTPForbidden
from pyramid.interfaces import IAuthenticationPolicy

from ..lib.config import OptionAnnotations, Option
from ..lib.logging import logger
from ..component import Component
from ..core.exception import ValidationError
from ..models import DBSession
from ..pyramid import Session, SessionStore
from ..pyramid.util import gensecret
from .. import db

from .models import Base, Principal, User, Group, OnFindReferencesData
from .exception import UserDisabledException
from .policy import AuthenticationPolicy
from .oauth import OAuthHelper, OAuthToken, OnAccessTokenToUser
from .util import _
from .views import OnUserLogin
from . import command # NOQA

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
                if user_la is None or (datetime.utcnow() - user_la) > delta:

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
                    "Membership in group 'administrators' required!")

        config.add_request_method(user, property=True)
        config.add_request_method(require_administrator)

        config.set_authentication_policy(AuthenticationPolicy(
            self, self.options.with_prefix('policy')))

        from . import views, api
        views.setup_pyramid(self, config)
        api.setup_pyramid(self, config)

    def query_stat(self):
        user_count = DBSession.query(db.func.count(User.id)).filter(
            db.and_(db.not_(User.system), db.not_(User.disabled))).scalar()

        la_everyone = DBSession.query(db.func.max(User.last_activity)).scalar()

        la_authenticated = DBSession.query(db.func.max(User.last_activity)).filter(
            User.keyname != 'guest').scalar()

        la_administrator = DBSession.query(db.func.max(User.last_activity)).filter(
            User.member_of.any(keyname='administrators')).scalar()

        return dict(
            user_count=user_count,
            last_activity=dict(
                everyone=la_everyone,
                authenticated=la_authenticated,
                administrator=la_administrator,
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
        auth_policy = request.registry.getUtility(IAuthenticationPolicy)
        user, tresp = auth_policy.authenticate_with_password(
            username=request.POST['login'].strip(),
            password=request.POST['password'])

        DBSession.flush()  # Force user.id sequence value
        headers = auth_policy.remember(request, (user.id, tresp))

        return user, headers

    def session_invite(self, keyname, url):
        user = User.filter_by(keyname=keyname).one_or_none()
        if user is None:
            group = Group.filter_by(keyname=keyname).one_or_none()
            if group is None:
                ValueError("User or group (keyname='%s') not found." % keyname)
            if len(group.members) == 0:
                ValueError("Group (keyname='%s') has no members." % keyname)
            else:
                user = group.members[0]

        if user.disabled:
            ValueError("User (keyname='%s') is disabled." % keyname)

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

        url = result.scheme + '://' + result.netloc + '/session/invite?' + urlencode(query)
        return url

    def check_user_limit(self, exclude_id=None):
        user_limit = self.options['user_limit']
        if user_limit is not None:
            query = DBSession.query(db.func.count(User.id)).filter(
                db.and_(db.not_(User.system), db.not_(User.disabled)))
            if exclude_id is not None:
                query = query.filter(User.id != exclude_id)

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
            logger.info("Expired cached OAuth tokens deleted: %d", rows)

    def backup_configure(self, config):
        super().backup_configure(config)
        config.exclude_table_data('public', OAuthToken.__tablename__)

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
    option_annotations += AuthenticationPolicy.option_annotations.with_prefix('policy')


def translate(self, trstring):
    return self.env.core.localizer().translate(trstring)
