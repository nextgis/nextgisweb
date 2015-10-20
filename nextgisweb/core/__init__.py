# -*- coding: utf-8 -*-
import os
import os.path
from pkg_resources import resource_filename

from sqlalchemy import create_engine

from ..package import pkginfo
from ..component import Component
from ..models import DBSession, Base
from ..i18n import Localizer, Translations

from .util import _
from .command import BackupCommand  # NOQA
from .backup import BackupBase, TableBackup, SequenceBackup  # NOQA


class CoreComponent(Component):
    identity = 'core'

    def __init__(self, env, settings):
        super(CoreComponent, self).__init__(env, settings)
        self.locale_default = None
        self.debug = False

    def initialize(self):
        Component.initialize(self)

        self.locale_default = self._settings.get('locale.default', 'en')
        self.locale_available = self._settings.get(
            'locale.available', 'en ru').split(' ')

        setting_debug = self._settings.get('debug', 'false').lower()
        self.debug = setting_debug in ('true', 'yes', '1')

        if 'system.name' not in self._settings:
            self._settings['system.name'] = "NextGIS Web"

        if 'system.full_name' not in self._settings:
            self._settings['system.full_name'] = self.localizer().translate(
                _("NextGIS geoinformation system"))

        sa_url = 'postgresql+psycopg2://%(user)s%(password)s@%(host)s/%(name)s' % dict(
            user=self._settings.get('database.user', 'nextgisweb'),
            password=(':' + self._settings['database.password']) if 'database.password' in self._settings else '',
            host=self._settings.get('database.host', 'localhost'),
            name=self._settings.get('database.name', 'nextgisweb'),
        )

        self.engine = create_engine(sa_url)
        self._sa_engine = self.engine

        setting_check_at_startup = self._settings.get(
            'database.check_at_startup', 'false').lower()
        if setting_check_at_startup in ('true', 'yes', '1'):
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
        return os.path.join(self.settings['sdir'], comp.identity) \
            if 'sdir' in self.settings else None

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

    def localizer(self, locale=None):
        if locale is None:
            locale = self.locale_default
        if not hasattr(self, '_localizer'):
            self._localizer = dict()
        if locale in self._localizer:
            return self._localizer[locale]

        translations = Translations()
        for pkg in pkginfo.packages:
            translations.scandir(resource_filename(pkg, 'locale'), locale)

        lobj = Localizer(locale, translations)
        self._localizer[locale] = lobj
        return lobj

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

        dict(key='locale.default', desc=u"Локаль, используемая по-умолчанию"),
        dict(key='locale.available', desc=u"Доступные локали"),
        dict(key='debug', desc=u"Дополнительный инструментарий для отладки"),
        dict(key='sdir', desc=u"Директория для хранения данных"),

        dict(key='permissions.disable_check.rendering', desc=u"Отключение проверки прав при рендеринге слоев"),
        dict(key='permissions.disable_check.identify', desc=u"Отключение проверки прав при получении информации об объектах"),
    )
