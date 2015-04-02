# -*- coding: utf-8 -*-
from pyramid.security import authenticated_userid
from sqlalchemy.orm.exc import NoResultFound

from ..component import Component

from .models import Base, Principal, User, Group
from . import command # NOQA

__all__ = ['Principal', 'User', 'Group']


@Component.registry.register
class AuthComponent(Component):
    identity = 'auth'
    metadata = Base.metadata

    def initialize_db(self):
        self.initialize_user(
            keyname='guest',
            system=True,
            display_name=u"Гость"
        )

        self.initialize_user(
            keyname='everyone',
            system=True,
            display_name=u"Любой пользователь"
        ).persist()

        self.initialize_user(
            keyname='authenticated',
            system=True,
            display_name=u"Прошедший проверку"
        ).persist()

        self.initialize_group(
            keyname='administrators',
            system=True,
            display_name=u"Администраторы",
            members=[self.initialize_user(
                keyname='administrator',
                display_name=u"Администратор",
                password='admin'
            ), ]
        ).persist()

        self.initialize_user(
            system=True,
            keyname='owner',
            display_name=u"Владелец"
        ).persist()

    def setup_pyramid(self, config):

        def user(request):
            user_id = authenticated_userid(request)
            if user_id:
                return User.filter_by(id=user_id).one()
            else:
                return User.filter_by(keyname='guest').one()

        config.set_request_property(user, 'user', reify=True)

        from . import views
        views.setup_pyramid(self, config)

    def initialize_user(self, keyname, **kwargs):
        """ Проверяет наличие в БД пользователя с keyname и в случае
        отсутствия создает его с параметрами kwargs """

        try:
            obj = User.filter_by(keyname=keyname).one()
        except NoResultFound:
            obj = User(keyname=keyname, **kwargs).persist()

        return obj

    def initialize_group(self, keyname, **kwargs):
        """ Проверяет наличие в БД группы пользователей с keyname и в случае
        отсутствия создает ее с параметрами kwargs """

        try:
            obj = Group.filter_by(keyname=keyname).one()
        except NoResultFound:
            obj = Group(keyname=keyname, **kwargs).persist()

        return obj
