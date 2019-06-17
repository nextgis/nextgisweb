# -*- coding: utf-8 -*-
import os
import os.path
import json
from pkg_resources import resource_filename

from sqlalchemy import create_engine
from sqlalchemy.orm.exc import NoResultFound
from sqlalchemy.engine.url import (
    URL as EngineURL,
    make_url as make_engine_url)

from .. import db
from ..package import pkginfo
from ..component import Component
from ..models import DBSession
from ..i18n import Localizer, Translations

from .util import _
from .model import Base, Setting
from .command import BackupCommand  # NOQA
from .backup import BackupBase, TableBackup, SequenceBackup  # NOQA


class CoreComponent(Component):
    identity = 'core'
    metadata = Base.metadata

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

        sa_url = make_engine_url(EngineURL(
            'postgresql+psycopg2',
            host=self._settings.get('database.host', 'localhost'),
            database=self._settings.get('database.name', 'nextgisweb'),
            username=self._settings.get('database.user', 'nextgisweb'),
            password=self._settings.get('database.password', '')
        ))

        self.engine = create_engine(sa_url)
        self._sa_engine = self.engine

        setting_check_at_startup = self._settings.get(
            'database.check_at_startup', 'false').lower()
        if setting_check_at_startup in ('true', 'yes', '1'):
            conn = self._sa_engine.connect()
            conn.close()

        DBSession.configure(bind=self._sa_engine)

        self.DBSession = DBSession

        self._backup_path = self.settings.get('backup.filename')
        self._backup_filename = self.settings.get(
            'backup.filename', '%Y%m%d-%H%M%S')

        self._backup_upload_bucket = self.settings.get(
            'backup_upload.bucket', 'ngwbackup')
        self._backup_upload_server = self.settings.get('backup_upload.server')
        self._backup_upload_access_key = self.settings.get(
            'backup_upload.access_key')
        self._backup_upload_secret_key = self.settings.get(
            'backup_upload.secret_key')

    def initialize_db(self):
        for k, v in (
            ('system.name', 'NextGIS Web'),
            ('system.full_name', self.localizer().translate(
                _('NextGIS geoinformation system'))),
            ('units', 'metric'),
            ('degree_format', 'dd')
        ):
            self.init_settings(self.identity, k, self._settings.get(k, v))

    def backup(self):
        metadata = self.env.metadata()

        conn = DBSession.connection()

        for tab in metadata.sorted_tables:
            yield TableBackup(self, tab.key)

            # Search sequence created automatically for PK
            # using "table_field_seq" mask and add to archive
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
        """ Get component's file storage folder """
        return os.path.join(self.settings['sdir'], comp.identity) \
            if 'sdir' in self.settings else None

    def mksdir(self, comp):
        """ Create file storage folder """
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

    def settings_exists(self, component, name):
        return DBSession.query(db.exists().where(db.and_(
            Setting.component == component, Setting.name == name
        ))).scalar()

    def settings_get(self, component, name):
        try:
            obj = Setting.filter_by(component=component, name=name).one()
            return json.loads(obj.value)
        except NoResultFound:
            raise KeyError("Setting %s.%s not found!" % (component, name))

    def settings_set(self, component, name, value):
        try:
            obj = Setting.filter_by(component=component, name=name).one()
        except NoResultFound:
            obj = Setting(component=component, name=name).persist()
        obj.value = json.dumps(value)

    def settings_delete(self, component, name):
        try:
            DBSession.delete(Setting.filter_by(
                component=component, name=name).one())
        except NoResultFound:
            pass

    def init_settings(self, component, name, value):
        try:
            self.settings_get(component, name)
        except KeyError:
            self.settings_set(component, name, value)

    def query_stat(self):
        result = dict()
        try:
            result['full_name'] = self.settings_get('core', 'system.full_name')
        except KeyError:
            pass

        result['database_size'] = DBSession.query(db.func.pg_database_size(
            db.func.current_database(),)).scalar()

        return result

    settings_info = (
        dict(key='system.name', default=u"NextGIS Web", desc=u"GIS name"),
        dict(key='system.full_name', default=u"NextGIS Web", desc=u"Full GIS nane"),

        dict(key='database.host', default='localhost', desc=u"DB server name"),
        dict(key='database.name', default='nextgisweb', desc=u"DB name on the server"),
        dict(key='database.user', default='nextgisweb', desc=u"DB user name"),
        dict(key='database.password', desc=u"DB user password"),

        dict(key='database.check_at_startup', desc=u"Check connection of startup"),

        dict(key='packages.ignore', desc=u"Ignore listed packages"),
        dict(key='components.ignore', desc=u"Ignore listed components"),

        dict(key='locale.default', desc=u"Default locale"),
        dict(key='locale.available', desc=u"Available locale"),
        dict(key='debug', desc=u"Additional debug tools"),
        dict(key='sdir', desc=u"Data storage folder"),

        dict(key='permissions.disable_check.rendering', desc=u"Turn off permission checking for rendering"),
        dict(key='permissions.disable_check.identify', desc=u"Turn off permission checking for identification"),
    )
