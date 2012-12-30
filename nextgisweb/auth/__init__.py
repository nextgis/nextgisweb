# -*- coding: utf-8 -*-
from pyramid.security import authenticated_userid

from ..component import Component
from ..models import DBSession

from .models import Principal, User, Group

@Component.registry.register
class AuthComponent(Component):
    identity = 'auth'

    @classmethod
    def initialize_db(cls, dbsession):
        dbsession.add(User(system=True, keyname='anonymous', display_name=u"Гость"))
        dbsession.add(User(system=True, keyname='owner', display_name=u"Владелец"))
        dbsession.add(User(keyname='administrator', display_name=u"Администратор"))

        dbsession.add(Group(system=True, keyname='everyone', display_name=u"Все пользователи"))
        dbsession.add(Group(system=True, keyname='authorized', display_name=u"Авторизованные пользователи"))
        dbsession.add(Group(system=True, keyname='administrator', display_name=u"Администраторы"))

        dbsession.add(User(display_name=u"Иванов А.А."))
        dbsession.add(User(display_name=u"Петров Б.Б."))
        dbsession.add(User(display_name=u"Сидоров В.В."))

    @classmethod
    def setup_routes(cls, config):
        config.set_request_property(property_user, 'user', reify=True)

        config.add_route('auth.login', '/login')
        config.add_route('auth.logout', '/logout')


def property_user(request):
    user_id = authenticated_userid(request)
    if user_id:
        return DBSession.query(User).get(user_id)
    else:
        return DBSession.query(User).filter_by(keyname='anonymous').one()
