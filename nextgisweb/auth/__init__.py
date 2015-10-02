# -*- coding: utf-8 -*-
from __future__ import unicode_literals, print_function, absolute_import
from pyramid.security import authenticated_userid
from sqlalchemy.orm.exc import NoResultFound

from ..component import Component

from .models import Base, Principal, User, Group, UserDisabled
from . import command # NOQA
from .util import _

__all__ = ['Principal', 'User', 'Group']


@Component.registry.register
class AuthComponent(Component):
    identity = 'auth'
    metadata = Base.metadata

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
            user_id = authenticated_userid(request)
            if user_id:
                user = User.filter_by(id=user_id).one()
                if user.disabled:
                    raise UserDisabled()
                return user
            else:
                return User.filter_by(keyname='guest').one()

        config.set_request_property(user, reify=True)

        from . import views
        views.setup_pyramid(self, config)

    def initialize_user(self, keyname, display_name, **kwargs):
        """ Проверяет наличие в БД пользователя с keyname и в случае
        отсутствия создает его с параметрами kwargs """

        try:
            obj = User.filter_by(keyname=keyname).one()
        except NoResultFound:
            obj = User(
                keyname=keyname,
                display_name=translate(self, display_name),
                **kwargs).persist()

        return obj

    def initialize_group(self, keyname, display_name, **kwargs):
        """ Проверяет наличие в БД группы пользователей с keyname и в случае
        отсутствия создает ее с параметрами kwargs """

        try:
            obj = Group.filter_by(keyname=keyname).one()
        except NoResultFound:
            obj = Group(
                keyname=keyname,
                display_name=translate(self, display_name),
                **kwargs).persist()

        return obj


def translate(self, trstring):
    return self.env.core.localizer().translate(trstring)
