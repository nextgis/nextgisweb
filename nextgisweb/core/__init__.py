# -*- coding: utf-8 -*-
import os
import os.path

from sqlalchemy import create_engine

from ..component import Component
from ..models import DBSession, Base

from .command import BackupCommand  # NOQA
from .backup import BackupBase, TableBackup, SequenceBackup  # NOQA


@Component.registry.register
class CoreComponent(Component):
    identity = 'core'

    def initialize(self):
        Component.initialize(self)

        sa_url = 'postgresql+psycopg2://%(user)s%(password)s@%(host)s/%(name)s' % dict(
            user=self._settings['database.user'],
            password=(':' + self._settings['database.password']) if 'database.password' in self._settings else '',
            host=self._settings['database.host'],
            name=self._settings['database.name'],
        )

        self.engine = create_engine(sa_url)
        self._sa_engine = self.engine

        if self._settings.get('database.check_at_startup', 'no').lower() in ('yes', 'true'):
            conn = self._sa_engine.connect()
            conn.close()

        DBSession.configure(bind=self._sa_engine)
        Base.metadata.bind = self._sa_engine

        self.DBSession = DBSession
        self.Base = Base

        self.metadata = Base.metadata

        if 'backup.filename' not in self.settings:
            self.settings['backup.filename'] = '%y%m%d-%H%M%S'

    def backup(self):
        metadata = self.env.metadata()

        conn = DBSession.connection()

        for tab in metadata.sorted_tables:
            yield TableBackup(self, tab.key)

            # Ищем sequence созданные автоматически для PK
            # по маске "table_field_seq" и добавляем их в архив
            for col in tab.columns:
                if col.primary_key:
                    test_seq_name = tab.name + "_" + col.name + "_seq"
                    res = conn.execute(
                        """SELECT relname FROM pg_class
                        WHERE relkind = 'S' AND relname = %s""",
                        test_seq_name)

                    row = res.fetchone()
                    if row:
                        yield SequenceBackup(self, test_seq_name)

        for seq in metadata._sequences.itervalues():
            yield SequenceBackup(self, seq.name)

    def gtsdir(self, comp):
        """ Получить директорию хранения файлов компонента """
        return os.path.join(self.settings['sdir'], comp.identity)

    def mksdir(self, comp):
        """ Создание директории для хранения файлов """
        self.bmakedirs(self.settings['sdir'], comp.identity)

    def bmakedirs(self, base, path):
        fpath = os.path.join(base, path)
        if os.path.isdir(fpath):
            return

        if not os.path.isdir(base):
            raise IOError("Invalid base directory path")

        os.makedirs(fpath)

    settings_info = (
        dict(key='system.name', default=u"NextGIS Web", desc=u"Название системы"),
        dict(key='system.full_name', default=u"Геоинформационная система NextGIS", desc=u"Полное название системы"),

        dict(key='database.host', default='localhost', desc=u"Имя сервера БД"),
        dict(key='database.name', default='nextgisweb', desc=u"Имя БД на сервере"),
        dict(key='database.user', default='nextgisweb', desc=u"Имя пользователя БД"),
        dict(key='database.password', desc=u"Пароль пользователя БД"),

        dict(key='database.check_at_startup', desc=u"Проверять подключение при запуске"),

        dict(key='packages.ignore', desc=u"Не загружать перечисленные пакеты"),
        dict(key='components.ignore', desc=u"Не загружать перечисленные компоненты"),

        dict(key='sdir', desc=u"Директория для хранения данных")
    )
