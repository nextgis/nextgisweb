# -*- coding: utf-8 -*-
from pyramid.security import authenticated_userid
from ..component import Component


@Component.registry.register
class AuthComponent(Component):
    identity = 'auth'

    def initialize_db(self):
        self.User(
            system=True,
            keyname='guest',
            display_name=u"Гость"
        ).persist()

        self.User(
            system=True,
            keyname='owner',
            display_name=u"Владелец"
        ).persist()

        self.User(
            system=True,
            keyname='everyone',
            display_name=u"Любой пользователь"
        ).persist()

        self.Group(
            keyname='administrators',
            display_name=u"Администраторы",
            members=[self.User(
                keyname='administrator',
                display_name=u"Администратор"
            ), ]
        ).persist()

        self.User(display_name=u"Иванов А.А.", keyname="ivanov").persist()
        self.User(display_name=u"Петров Б.Б.", keyname="petrov").persist()
        self.User(display_name=u"Сидоров В.В.", keyname="sidorov").persist()

    def initialize(self):
        from . import models
        models.initialize(self)

    def setup_pyramid(self, config):

        def user(request):
            user_id = authenticated_userid(request)
            if user_id:
                return self.User.filter_by(id=user_id).one()
            else:
                return self.User.filter_by(keyname='guest').one()

        config.set_request_property(user, 'user', reify=True)

        from . import views
        views.setup_pyramid(self, config)
