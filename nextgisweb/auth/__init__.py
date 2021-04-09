# -*- coding: utf-8 -*-
from __future__ import division, absolute_import, print_function, unicode_literals

from datetime import datetime, timedelta

import transaction
from sqlalchemy.orm.exc import NoResultFound
from pyramid.httpexceptions import HTTPForbidden

from ..lib.config import OptionAnnotations, Option
from ..component import Component
from ..core.exception import ValidationError
from ..models import DBSession
from .. import db

from .models import Base, Principal, User, Group
from .exception import UserDisabledException
from .policy import AuthenticationPolicy
from .oauth import OAuthHelper, OAuthToken, OnAccessTokenToUser
from .util import _
from .views import OnUserLogin
from . import command # NOQA

__all__ = ['Principal', 'User', 'Group', 'OnAccessTokenToUser', 'OnUserLogin']


class AuthComponent(Component):
    identity = 'auth'
    metadata = Base.metadata

    def initialize(self):
        super(AuthComponent, self).initialize()
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
            user = User.filter(
                (User.id == user_id) if user_id is not None
                else (User.keyname == 'guest')).one()

            if user.disabled:
                raise UserDisabledException()

            # Set user last activity
            delta = self.options['activity_delta']
            if user.last_activity is None or (datetime.utcnow() - user.last_activity) > delta:
                def update_last_activity(request):
                    with transaction.manager:
                        DBSession.query(User).filter_by(
                            principal_id=user.id, last_activity=user.last_activity
                        ).update(dict(last_activity=datetime.utcnow()))
                request.add_finished_callback(update_last_activity)

            # Keep user in request environ for audit component
            request.environ['auth.user'] = user

            return user

        def require_administrator(request):
            if not request.user.is_administrator:
                raise HTTPForbidden(
                    "Membership in group 'administrators' required!")

        config.add_request_method(user, reify=True)
        config.add_request_method(require_administrator)

        config.set_authentication_policy(AuthenticationPolicy(
            self, self.options.with_prefix('policy')))

        from . import views, api
        views.setup_pyramid(self, config)
        api.setup_pyramid(self, config)

    def query_stat(self):
        user_count = DBSession.query(db.func.count(User.id)).filter(
            db.not_(User.system)).scalar()

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

    def check_user_limit(self, exclude_id=None):
        user_limit = self.options['user_limit']
        if user_limit is not None:
            query = DBSession.query(db.func.count(User.id)).filter(
                db.and_(db.not_(User.system), db.not_(User.disabled)))
            if exclude_id is not None:
                query = query.filter(User.id != exclude_id)

            active_user_count = query.scalar()
            if active_user_count >= user_limit:
                raise ValidationError(_(
                    "Maximum number of users is exceeded. The limit is %s."
                ) % user_limit)

    def maintenance(self):
        with transaction.manager:
            # Add additional minute for clock skew
            exp = datetime.utcnow() + timedelta(seconds=60)
            self.logger.debug("Cleaning up expired OAuth tokens (exp < %s)", exp)

            rows = OAuthToken.filter(OAuthToken.exp < exp).delete()
            self.logger.info("Expired cached OAuth tokens deleted: %d", rows)

    option_annotations = OptionAnnotations((
        Option('register', bool, default=False,
               doc="Allow user registration."),

        Option('login_route_name', default='auth.login',
               doc="Name of route for login page."),

        Option('logout_route_name', default='auth.logout',
               doc="Name of route for logout page."),

        Option('activity_delta', timedelta, default=timedelta(minutes=10),
               doc="User last activity update time delta in seconds."),

        Option('user_limit', int, default=None, doc="Limit of enabled users"),
    ))

    option_annotations += OAuthHelper.option_annotations.with_prefix('oauth')
    option_annotations += AuthenticationPolicy.option_annotations.with_prefix('policy')


def translate(self, trstring):
    return self.env.core.localizer().translate(trstring)
