# -*- coding: utf-8 -*-
from pyramid.security import authenticated_userid

from ..component import Component
from ..models import DBSession

from .models import Principal, User, Group

@Component.registry.register
class AuthComponent(Component):
    identity = 'auth'


    @classmethod
    def setup_routes(cls, config):
        config.set_request_property(property_user, 'user', reify=True)

        config.add_route('auth.login', '/login')
        config.add_route('auth.logout', '/logout')

    def initialize_db(self):
        DBSession = self.env.core.DBSession

        guest = User(
            system=True,
            keyname='guest',
            display_name=u"Гость"
        )
        DBSession.add(guest)

        owner = User(
            system=True,
            keyname='owner',
            display_name=u"Владелец"
        )
        DBSession.add(owner)

        administrator = User(
            keyname='administrator',
            display_name=u"Администратор"
        )
        DBSession.add(administrator)


        everyone = Group(
            system=True,
            keyname='everyone',
            display_name=u"Все пользователи"
        )
        DBSession.add(everyone)

        authorized = Group(
            system=True,
            keyname='authorized',
            display_name=u"Авторизованные пользователи"
        )
        DBSession.add(authorized)

        administrators = Group(
            system=True,
            keyname='administrators',
            display_name=u"Администраторы",
            members=[administrator, ]
        )
        DBSession.add(administrators)

        DBSession.add(User(display_name=u"Иванов А.А."))
        DBSession.add(User(display_name=u"Петров Б.Б."))
        DBSession.add(User(display_name=u"Сидоров В.В."))

    def initialize(self):
        from . import models
        models.initialize(self)

    def setup_pyramid(self, config):
        from . import views
        views.setup_pyramid(self, config)


def property_user(request):
    user_id = authenticated_userid(request)
    if user_id:
        return DBSession.query(User).get(user_id)
    else:
        return DBSession.query(User).filter_by(keyname='guest').one()
