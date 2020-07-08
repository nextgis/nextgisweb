# -*- coding: utf-8 -*-
from __future__ import division, absolute_import, print_function, unicode_literals

from datetime import datetime, timedelta

from sqlalchemy.orm.exc import NoResultFound
from pyramid.httpexceptions import HTTPForbidden
import transaction

from ..lib.config import Option
from ..component import Component
from ..models import DBSession
from .. import db

from .models import Base, Principal, User, Group, UserDisabled
from .oauth import OAuthServer
from .exception import DisabledUserException, InvalidCredentialsException
from .util import _
from . import command # NOQA

__all__ = ['Principal', 'User', 'Group']


class AuthComponent(Component):
    identity = 'auth'
    metadata = Base.metadata

    def __init__(self, env, settings):
        super(AuthComponent, self).__init__(env, settings)
        self.settings_register = self.options['register']
        self.oauth = OAuthServer(self.options.with_prefix('oauth')) \
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

        self.initialize_group(
            keyname='administrators',
            system=True,
            display_name=_("Administrators"),
            members=[self.initialize_user(
                keyname='administrator',
                display_name=_("Administrator"),
                password='admin'
            ), ]
        ).persist()

        self.initialize_user(
            system=True,
            keyname='owner',
            display_name=_("Owner")
        ).persist()

    def setup_pyramid(self, config):

        def user(request):
            user_id = request.authenticated_userid
            if user_id:
                user = User.filter_by(id=user_id).one()
            else:
                user = User.filter_by(keyname='guest').one()

            # Set user last activity
            delta = timedelta(seconds=self.options['activity_delta'])
            if user.last_activity is None or datetime.now() - user.last_activity > delta:
                def update_last_activity(request):
                    with transaction.manager:
                        DBSession.query(User).filter_by(
                            principal_id=user.id, last_activity=user.last_activity
                        ).update(dict(last_activity=datetime.utcnow()))
                request.add_finished_callback(update_last_activity)

            # Keep user in request environ for audit component
            request.environ['auth.user'] = user

            if user.disabled:
                raise UserDisabled()

            return user

        def require_administrator(request):
            if not request.user.is_administrator:
                raise HTTPForbidden(
                    "Membership in group 'administrators' required!")

        config.add_request_method(user, reify=True)
        config.add_request_method(require_administrator)

        from . import views, api
        views.setup_pyramid(self, config)
        api.setup_pyramid(self, config)

    def query_stat(self):
        user_count = DBSession.query(db.func.count(User.id)).scalar()

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

    def authenticate_with_password(self, username, password):
        user = None

        # Step 1: Authentication with local credentials

        q = User.filter_by(keyname=username)
        if self.oauth and not self.oauth.local_auth:
            q = q.filter_by(oauth_subject=None)

        try:
            test_user = q.one()
            if test_user.password == password:
                user = test_user
        except NoResultFound:
            pass

        # Step 2: Authentication with OAuth password if enabled

        if user is None and self.oauth is not None and self.oauth.password:
            tdata = self.oauth.grant_type_password(username, password)
            user = self.oauth.get_user(tdata['access_token'])

        if user is None:
            raise InvalidCredentialsException()
        elif user.disabled:
            raise DisabledUserException()

        return user

    option_annotations = (
        Option('register', bool, default=False, doc="Allow user registration."),

        Option(
            'login_route_name', default='auth.login',
            doc="Name of route for login page."),
        Option(
            'logout_route_name', default='auth.logout',
            doc="Name of route for logout page."),

        Option('oauth.enabled', bool, default=False),
        Option('oauth.register', bool, default=False),
        Option('oauth.local_auth', bool, default=True),
        Option('oauth.password', bool, default=False),

        Option('oauth.client_id', default=None),
        Option('oauth.client_secret', default=None, secure=True),

        Option('oauth.auth_endpoint', default=None),
        Option('oauth.token_endpoint'),
        Option('oauth.introspection_endpoint', default=None),
        Option('oauth.userinfo_endpoint', default=None),

        Option('oauth.endpoint_authorization', default=None, secure=True),

        Option('oauth.userinfo.scope', default=None),
        Option('oauth.userinfo.subject', default=None),
        Option('oauth.userinfo.keyname', default=None),
        Option('oauth.userinfo.display_name', default=None),

        Option(
            'activity_delta', int, default=600,
            doc="User last activity update time delta in seconds."),
    )


def translate(self, trstring):
    return self.env.core.localizer().translate(trstring)
