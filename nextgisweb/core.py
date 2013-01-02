# -*- coding: utf-8 -*-

from .component import Component
from .models import DBSession, Base
from sqlalchemy import create_engine


@Component.registry.register
class CoreComponent(Component):
    identity = 'core'

    def initialize(self):
        sa_url = 'postgresql+psycopg2://%(user)s%(password)s@%(host)s/%(name)s' % dict(
            user=self._settings['database.user'],
            password=(':' + self._settings['database.password']) if 'database.password' in self._settings else '',
            host=self._settings['database.host'],
            name=self._settings['database.name'],
        )

        self._sa_engine = create_engine(sa_url)
        DBSession.configure(bind=self._sa_engine)
        Base.metadata.bind = self._sa_engine

    settings_info = (
        dict(key='database.host', default='localhost', desc=u"Имя сервера БД"),
        dict(key='database.name', default='nextgisweb', desc=u"Имя БД на сервере"),
        dict(key='database.user', default='nextgisweb', desc=u"Имя пользователя БД"),
        dict(key='database.password', desc=u"Пароль пользователя БД"),
    )
