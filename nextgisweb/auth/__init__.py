# -*- coding: utf-8 -*-
from __future__ import division, absolute_import, print_function, unicode_literals
from sqlalchemy.orm.exc import NoResultFound
from pyramid.httpexceptions import HTTPForbidden

from ..lib.config import Option
from ..component import Component
from ..models import DBSession
from .. import db

from .models import Base, Principal, User, Group, UserDisabled
from .oauth import OAuthServer
from . import command # NOQA
from .util import _

__all__ = ['Principal', 'User', 'Group']


class AuthComponent(Component):
    identity = 'auth'
    metadata = Base.metadata

    def __init__(self, env, settings):
        super(AuthComponent, self).__init__(env, settings)
        self.settings_register = self.options['register']
        self.oauth = OAuthServer.from_options(self.options.with_prefix('oauth'))

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
        query_user = DBSession.query(db.func.count(User.id))
        return dict(user_count=query_user.scalar())

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

        Option('oauth.client_id'),
        Option('oauth.client_secret', secure=True),

        Option('oauth.auth_endpoint'),
        Option('oauth.token_endpoint'),
        Option('oauth.userinfo_endpoint'),

        Option('oauth.userinfo.scope', default=None),
        Option('oauth.userinfo.subject'),
        Option('oauth.userinfo.keyname'),
        Option('oauth.userinfo.display_name'),
    )


def translate(self, trstring):
    return self.env.core.localizer().translate(trstring)
