import multiprocessing
import os
import os.path
import platform
import sys
import io
import json
import re
import uuid
import warnings
from collections import OrderedDict
from datetime import datetime, timedelta
from pathlib import Path
from subprocess import check_output

import requests
from sqlalchemy import create_engine
from sqlalchemy.exc import OperationalError
from sqlalchemy.orm.exc import NoResultFound
from sqlalchemy.engine.url import (
    URL as EngineURL,
    make_url as make_engine_url)


# Prevent warning about missing __init__.py in migration directory. Is's OK
# and migration directory is intended for migration scripts.
warnings.filterwarnings(
    'ignore', r"^Not importing.*/core/migration.*__init__\.py$",
    category=ImportWarning)

from .. import db
from ..component import Component
from ..lib.config import Option
from ..models import DBSession
from ..i18n import Localizer, Translations
from ..package import pkginfo, enable_qualifications

from .util import _
from .model import Base, Setting
from .command import BackupCommand  # NOQA
from .backup import BackupBase, BackupMetadata  # NOQA
from .storage import StorageComponentMixin, KindOfData


class CoreComponent(
    StorageComponentMixin, 
    Component
):
    identity = 'core'
    metadata = Base.metadata

    def __init__(self, env, settings):
        super().__init__(env, settings)
        self.debug = self.options['debug']
        self.locale_default = self.options['locale.default']
        self.locale_available = self.options['locale.available']
        if self.locale_available is None:
            # Locales available by default
            self.locale_available = ['en', 'ru']

            # Locales from external translations
            ext_path = self.options['locale.external_path']
            if ext_path:
                ext_meta = Path(ext_path) / 'metadata.json'
                ext_meta = json.loads(ext_meta.read_text())
                self.locale_available.extend(ext_meta.get('locales', []))
            
            self.locale_available.sort()

    def initialize(self):
        super().initialize()

        # Enable version and git qulifications only in development mode. In
        # production mode we trust package metadata.
        enable_qualifications(self.debug)

        sa_url = self._engine_url()

        opt_db = self.options.with_prefix('database')
        lock_timeout_ms = int(opt_db['lock_timeout'].total_seconds() * 1000)
        args = dict(
            connect_args=dict(options='-c lock_timeout=%d' % lock_timeout_ms),
            pool_pre_ping=opt_db['pool.pre_ping']
        )
        if 'pool.recycle' in opt_db:
            args['pool_recycle'] = int(opt_db['pool.recycle'].total_seconds())
        self.engine = create_engine(sa_url, **args)
        self._sa_engine = self.engine

        DBSession.configure(bind=self._sa_engine)

        self.DBSession = DBSession

        # Methods for customization in components
        self.system_full_name_default = self.options.get(
            'system.full_name', self.localizer().translate(_('NextGIS geoinformation system')))
        self.support_url_view = lambda request: self.options['support_url']

    def is_service_ready(self):
        while True:
            try:
                sa_url = self._engine_url(error_on_pwfile=True)
                break
            except IOError as exc:
                yield "File [{}] is missing!".format(exc.filename)

        sa_engine = create_engine(sa_url)
        while True:
            try:
                with sa_engine.connect():
                    break
            except OperationalError as exc:
                yield str(exc.orig).rstrip()
        sa_engine.dispose()

    def healthcheck(self):
        try:
            sa_url = self._engine_url(error_on_pwfile=True)
        except IOError:
            return OrderedDict((
                ('success', False),
                ('message', "Database password file is missing!")
            ))

        sa_engine = create_engine(sa_url)
        try:
            with sa_engine.connect() as conn:
                conn.execute("SELECT 1")
        except OperationalError as exc:
            msg = str(exc.orig).rstrip()
            return OrderedDict((
                ('success', False),
                ('message', "Database connection failed: " + msg)
            ))
        sa_engine.dispose()

        return dict(success=True)

    def initialize_db(self):
        self.init_settings(self.identity, 'instance_id',
                           self.options.get('provision.instance_id', str(uuid.uuid4())))
        self.init_settings(self.identity, 'system.name',
                           self.options.get('system.name', 'NextGIS Web'))

    def gtsdir(self, comp):
        """ Get component's file storage folder """
        return os.path.join(self.options['sdir'], comp.identity) \
            if 'sdir' in self.options else None

    def mksdir(self, comp):
        """ Create file storage folder """
        self.bmakedirs(self.options['sdir'], comp.identity)

    def bmakedirs(self, base, path):
        if not os.path.isdir(base):
            raise IOError("Invalid base directory path")

        fpath = os.path.join(base, path)
        os.makedirs(fpath, exist_ok=True)

    def localizer(self, locale=None):
        if locale is None:
            locale = self.locale_default
        if not hasattr(self, '_localizer'):
            self._localizer = dict()
        if locale in self._localizer:
            return self._localizer[locale]

        translations = Translations()
        translations.load_envcomp(self.env, locale)

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

    def sys_info(self):
        result = []

        def try_check_output(cmd):
            try:
                return check_output(cmd, universal_newlines=True).strip()
            except Exception:
                msg = "Failed to get sys info with command: '%s'" % ' '.join(cmd)
                self.logger.error(msg, exc_info=True)

        result.append((_("Linux kernel"), platform.release()))
        os_distribution = try_check_output(['lsb_release', '-ds'])
        if os_distribution is not None:
            result.append((_("OS distribution"), os_distribution))

        def get_cpu_model():
            cpuinfo = try_check_output(['cat', '/proc/cpuinfo'])
            if cpuinfo is not None:
                for line in cpuinfo.split('\n'):
                    if line.startswith('model name'):
                        match = re.match(r'model name\s*:?(.*)', line)
                        return match.group(1).strip()
            return platform.processor()

        cpu_model = re.sub(r'\(?(TM|R)\)', '', get_cpu_model())
        result.append((_("CPU"), '{} × {}'.format(
            multiprocessing.cpu_count(), cpu_model)))

        mem_bytes = os.sysconf('SC_PAGE_SIZE') * os.sysconf('SC_PHYS_PAGES')
        result.append((_("RAM"), "%d MB" % (float(mem_bytes) / 2**20)))

        result.append(("Python", '.'.join(map(str, sys.version_info[0:3]))))

        pg_version = DBSession.execute('SHOW server_version').scalar()
        pg_version = re.sub(r'\s\(.*\)$', '', pg_version)
        result.append(("PostgreSQL", pg_version))
        result.append(("PostGIS", DBSession.execute('SELECT PostGIS_Lib_Version()').scalar()))

        gdal_version = try_check_output(['gdal-config', '--version'])
        if gdal_version is not None:
            result.append(("GDAL", gdal_version))

        return result

    def check_update(self):
        has_update = False

        query = OrderedDict()

        distr_opts = self.env.options.with_prefix('distribution')
        if distr_opts.get('name') is not None:
            query['distribution'] = distr_opts['name'] + ':' + distr_opts['version']

        query['package'] = [
            package.name + ':' + package.version
            for package in sorted(pkginfo.packages.values(), key=lambda p: p.name)]

        query['instance'] = self.instance_id
        query['event'] = 'initialize'

        try:
            res = requests.get(self.env.ngupdate_url + '/api/query',
                               query, timeout=5.0)
            if res.status_code == 200:
                has_update = res.json()['distribution']['status'] == 'has_update'
        except Exception:
            pass

        return has_update

    def query_stat(self):
        result = dict()
        result['full_name'] = self.system_full_name()
        result['database_size'] = DBSession.query(db.func.pg_database_size(
            db.func.current_database(),)).scalar()
        if self.options['storage.enabled']:
            result['storage'] = self.query_storage()

        return result

    def system_full_name(self):
        try:
            return self.settings_get(self.identity, 'system.full_name')
        except KeyError:
            return self.system_full_name_default

    @property
    def instance_id(self):
        return self.settings_get(self.identity, 'instance_id')

    def _db_connection_args(self, error_on_pwfile=False):
        opt_db = self.options.with_prefix('database')
        con_args = dict()
        con_args['host'] = opt_db['host']
        con_args['port'] = opt_db['port']
        con_args['database'] = opt_db['name']
        con_args['username'] = opt_db['user']

        if opt_db['password'] is not None:
            con_args['password'] = opt_db['password']
        elif opt_db['pwfile'] is not None:
            try:
                with io.open(opt_db['pwfile']) as fd:
                    con_args['password'] = fd.read().rstrip()
            except IOError:
                if error_on_pwfile:
                    raise
        return con_args

    def _engine_url(self, error_on_pwfile=False):
        con_args = self._db_connection_args(error_on_pwfile=error_on_pwfile)
        return make_engine_url(EngineURL(
            'postgresql+psycopg2', **con_args))

    def get_backups(self):
        backup_path = Path(self.options['backup.path'])
        backup_filename = self.options['backup.filename']

        # Replace strftime placeholders with '*' in file glob
        glob_expr = re.sub('(?:%.)+', '*', backup_filename)
        result = list()
        for fn in backup_path.glob(glob_expr):
            relfn = fn.relative_to(backup_path)
            result.append(BackupMetadata(
                relfn, datetime.strptime(str(relfn), backup_filename),
                fn.stat().st_size))
        result = sorted(result, key=lambda x: x.timestamp, reverse=True)
        return result

    def backup_filename(self, filename):
        return os.path.join(self.options['backup.path'], filename)

    option_annotations = (
        Option('system.name', default="NextGIS Web"),
        Option('system.full_name', default=None),

        # Database options
        Option('database.host', default="localhost"),
        Option('database.port', int, default=5432),
        Option('database.name', default="nextgisweb"),
        Option('database.user', default="nextgisweb"),
        Option('database.password', secure=True, default=None),
        Option('database.pwfile', default=None),
        Option('database.lock_timeout', timedelta, default=timedelta(seconds=30)),
        Option('database.pool.pre_ping', bool, default=False, doc=(
            "Test connections for liveness upon each checkout.")),
        Option('database.pool.recycle', timedelta, default=None, doc=(
            "Recycle connections after the given time delta.")),

        # Data storage
        Option('sdir', required=True, doc=(
            "Path to filesytem data storage where data stored along with "
            "database. Other components file_upload create subdirectories "
            "in it.")),

        # Backup storage
        Option('backup.path', doc=(
            "Path to directory in filesystem where backup created if target "
            "destination is not specified.")),

        Option('backup.filename', default='%Y%m%d-%H%M%S.ngwbackup', doc=(
            "File name template (passed to strftime) for filename in "
            "backup.path if backup target destination is not specified.")),

        # Estimate storage
        Option('storage.enabled', bool, default=False),

        # Ignore packages and components
        Option('packages.ignore', doc=(
            "Deprecated, use environment package.* option instead.")),
        Option('components.ignore', doc=(
            "Deperected, use environment component.* option instead.")),

        # Locale settings
        Option('locale.default', default='en'),
        Option('locale.available', list, default=None),
        Option('locale.external_path', default=None),
        Option('locale.poeditor.project_id', str, default=None),
        Option('locale.poeditor.api_token', str, default=None),

        # Other deployment settings
        Option('support_url', default="https://nextgis.com/contact/"),
        Option('provision.instance_id', default=None),

        # Debug settings
        Option('debug', bool, default=False, doc=(
            "Enable additional debug tools.")),
    )
