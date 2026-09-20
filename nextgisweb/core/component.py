import os
import os.path
import re
import uuid
from abc import ABC, abstractmethod
from datetime import datetime, timedelta
from pathlib import Path

import requests
import sqlalchemy as sa
from msgspec import UNSET
from requests.exceptions import JSONDecodeError, RequestException
from sqlalchemy import create_engine
from sqlalchemy.exc import NoResultFound
from sqlalchemy.orm import configure_mappers

from nextgisweb.env import Component, DBSession, gettext, inject
from nextgisweb.env.package import enable_qualifications, pkginfo
from nextgisweb.lib import json
from nextgisweb.lib.config import Option, SizeInBytes
from nextgisweb.lib.saext import postgres_url

from nextgisweb.i18n import Localizer, Translations

from .backup import BackupMetadata
from .model import Setting
from .storage import StorageComponentMixin


class SystemFullNameDefault(ABC):
    @abstractmethod
    def __call__(self) -> str: ...


class SupportUrl(ABC):
    @abstractmethod
    def __call__(self) -> str | None: ...


class CoreComponent(StorageComponentMixin, Component):
    def __init__(self, env, settings):
        super().__init__(env, settings)
        self.debug = self.options["debug"]
        self.locale_default = self.options["locale.default"]
        self.locale_available = self.options["locale.available"]
        if self.locale_available is None:
            # Locales available by default
            self.locale_available = ["en", "ru"]

            # Locales from external translations
            ext_path = self.options["locale.external_path"]
            if ext_path:
                ext_meta = Path(ext_path) / "metadata.json"
                ext_meta = json.loads(ext_meta.read_text())
                self.locale_available.extend(ext_meta.get("locales", []))

            self.locale_available.sort()

        from .fontconfig import FontConfig

        self.fontconfig = FontConfig(self)

    def initialize(self):
        super().initialize()

        # Enable version and git qulifications only in development mode. In
        # production mode we trust package metadata.
        enable_qualifications(self.debug)

        sa_url = self._engine_url()

        opt_db = self.options.with_prefix("database")
        lock_timeout_ms = int(opt_db["lock_timeout"].total_seconds() * 1000)
        args = dict(
            json_serializer=json.dumps,
            json_deserializer=json.loads,
            connect_args=dict(
                connect_timeout=int(opt_db["connect_timeout"].total_seconds()),
                options="-c lock_timeout=%d" % lock_timeout_ms,
            ),
            pool_pre_ping=opt_db["pool.pre_ping"],
        )
        if "pool.recycle" in opt_db:
            args["pool_recycle"] = int(opt_db["pool.recycle"].total_seconds())
        self.engine = create_engine(sa_url, **args)
        self._sa_engine = self.engine

        # Without configure_mappers() some backrefs won't work
        configure_mappers()

        DBSession.configure(bind=self._sa_engine)
        self.DBSession = DBSession

        # For further customization in components
        self.env.register(SystemFullNameDefault, SystemFullNameDefaultImpl())
        self.env.register(SupportUrl, SupportUrlImpl())

        self.fontconfig.initialize()

    def initialize_db(self):
        self.init_settings(
            self.identity,
            "instance_id",
            self.options.get("provision.instance_id", str(uuid.uuid4())),
        )

        system_title = self.options["provision.system.title"]
        if system_title is not None:
            # TODO: Rename system.full_name to system.title
            self.init_settings(self.identity, "system.full_name", system_title)

    def gtsdir(self, comp):
        """Get component's file storage folder"""
        return (
            os.path.join(self.options["sdir"], comp.identity) if "sdir" in self.options else None
        )

    def mksdir(self, comp):
        """Create file storage folder"""
        self.bmakedirs(self.options["sdir"], comp.identity)

    def bmakedirs(self, base, path):
        if not os.path.isdir(base):
            raise OSError("Invalid base directory path")

        fpath = os.path.join(base, path)
        os.makedirs(fpath, exist_ok=True)

    def localizer(self, locale=None):
        if locale is None:
            locale = self.locale_default
        if not hasattr(self, "_localizer"):
            self._localizer = dict()
        if locale in self._localizer:
            return self._localizer[locale]

        translations = Translations()
        translations.load_envcomp(self.env, locale)

        lobj = Localizer(locale, translations)
        self._localizer[locale] = lobj
        return lobj

    def settings_exists(self, component, name):
        return DBSession.query(
            sa.exists().where(sa.and_(Setting.component == component, Setting.name == name))
        ).scalar()

    def settings_get(self, component, name, default=UNSET):
        try:
            obj = Setting.filter_by(component=component, name=name).one()
            return obj.value
        except NoResultFound:
            if default is UNSET:
                raise KeyError("Setting %s.%s not found!" % (component, name))
            else:
                return default

    def settings_set(self, component, name, value):
        try:
            obj = Setting.filter_by(component=component, name=name).one()
        except NoResultFound:
            obj = Setting(component=component, name=name).persist()
        obj.value = value

    def settings_delete(self, component, name):
        try:
            DBSession.delete(Setting.filter_by(component=component, name=name).one())
        except NoResultFound:
            pass

    def init_settings(self, component, name, value):
        try:
            self.settings_get(component, name)
        except KeyError:
            self.settings_set(component, name, value)

    def check_update(self):
        ngupdate_url = self.env.ngupdate_url
        if ngupdate_url is None:
            return False

        query = dict()

        distr_opts = self.env.options.with_prefix("distribution")
        if distr_opts.get("name") is not None:
            query["distribution"] = distr_opts["name"] + ":" + distr_opts["version"]

        query["package"] = [
            package.name + ":" + package.version
            for package in sorted(pkginfo.packages.values(), key=lambda p: p.name)
        ]

        query["instance"] = self.instance_id
        query["event"] = "initialize"

        try:
            res = requests.get(ngupdate_url + "/api/query", query, timeout=5.0)
            res.raise_for_status()
        except RequestException:
            return False

        try:
            data = res.json()
        except JSONDecodeError:
            return False

        if "distribution" in data:
            return data["distribution"].get("status") == "has_update"

        return False

    @inject()
    def system_full_name(self, *, default_factory: SystemFullNameDefault = inject.arg()) -> str:
        try:
            return self.settings_get(self.identity, "system.full_name")
        except KeyError:
            return default_factory()

    @property
    def instance_id(self):
        return self.settings_get(self.identity, "instance_id")

    def _db_connection_args(self, error_on_pwfile=False):
        opt_db = self.options.with_prefix("database")
        con_args = dict()
        con_args["host"] = opt_db["host"]
        con_args["port"] = opt_db["port"]
        con_args["database"] = opt_db["name"]
        con_args["username"] = opt_db["user"]

        if opt_db["password"] is not None:
            con_args["password"] = opt_db["password"]
        elif opt_db["pwfile"] is not None:
            try:
                with open(opt_db["pwfile"]) as fd:
                    con_args["password"] = fd.read().rstrip()
            except OSError:
                if error_on_pwfile:
                    raise
        return con_args

    def _engine_url(self, error_on_pwfile=False):
        con_args = self._db_connection_args(error_on_pwfile=error_on_pwfile)
        return postgres_url(**con_args)

    def get_backups(self):
        backup_path = Path(self.options["backup.path"])
        backup_filename = self.options["backup.filename"]

        # Replace strftime placeholders with '*' in file glob
        glob_expr = re.sub("(?:%.)+", "*", backup_filename)
        result = list()
        for fn in backup_path.glob(glob_expr):
            relfn = fn.relative_to(backup_path)
            result.append(
                BackupMetadata(
                    str(relfn),
                    datetime.strptime(str(relfn), backup_filename),
                    fn.stat().st_size,
                )
            )
        result = sorted(result, key=lambda x: x.timestamp, reverse=True)
        return result

    def backup_filename(self, filename):
        return os.path.join(self.options["backup.path"], filename)

    # fmt: off
    option_annotations = (
        # Database options
        Option("database.host", default="localhost"),
        Option("database.port", int, default=5432),
        Option("database.name", default="nextgisweb"),
        Option("database.user", default="nextgisweb"),
        Option("database.password", secure=True, default=None),
        Option("database.pwfile", default=None),
        Option("database.connect_timeout", timedelta, default=timedelta(seconds=5)),
        Option("database.lock_timeout", timedelta, default=timedelta(seconds=30)),
        Option("database.pool.pre_ping", bool, default=False, doc=("Test connections for liveness upon each checkout.")),
        Option("database.pool.recycle", timedelta, default=None, doc=("Recycle connections after the given time delta.")),
        # Database for running tests
        Option("test.database.host"),
        Option("test.database.port", int),
        Option("test.database.name"),
        Option("test.database.user"),
        Option("test.database.password", secure=True),
        # S3 storage for running tests
        Option("test.storage.endpoint"),
        Option("test.storage.bucket"),
        Option("test.storage.access_key"),
        Option("test.storage.secret_key"),
        Option("test.storage.prefix", default=""),
        # Data storage
        Option("sdir", required=True, doc=(
            "Path to filesytem data storage where data stored along "
            "with database.Other components file_upload create "
            "subdirectories in it.")),
        # Backup storage
        Option("backup.path", doc=(
            "Path to directory in filesystem where backup created if target "
            "destination is not specified.")),
        Option("backup.filename", default="%Y%m%d-%H%M%S.ngwbackup", doc=(
            "File name template (passed to strftime) for filename in "
            "backup.path if backup target destination is not specified.")),
        Option("backup.tmpdir", default=None, doc=(
            "Temporary directory used for backup integrity and archive "
            "packing/unpacking.")),
        Option("backup.interval", timedelta, default=None, doc=(
            "Planned backup interval, if exceeded, heathcheck will fail.")),
        # Estimate storage
        Option("storage.enabled", bool, default=False),
        Option("storage.limit", SizeInBytes, default=None, doc=("Storage limit.")),
        # Healthcheck
        Option("healthcheck.free_space", float, default=10, doc=(
            "Free space check during healthcheck in percent (0 for don't check).")),
        Option("healthcheck.free_inodes", float, default=10, doc=(
            "Free inodes check during healthcheck in percent (0 for don't check).")),
        # Locale settings
        Option("locale.default", default="en"),
        Option("locale.available", list, default=None),
        Option("locale.external_path", default=None),
        Option("locale.poeditor.project_id", str, default=None),
        Option("locale.poeditor.api_token", str, default=None),
        Option("locale.contribute_url", default=None),
        # Other deployment settings
        Option("support_url", default="https://nextgis.com/redirect/{lang}/contact/"),
        Option("contact_administrator_url", default=None),
        Option("provision.instance_id", default=None),
        Option("provision.system.title", default=None),
        Option("maintenance.interval", timedelta, default=None, doc=(
            "Planned maintenance interval, if exceeded, healthcheck will fail.")),
        Option("sysinfo_host_config", bool, default=True, doc=(
            "Show host configuration info in system information.")),
        # Debug settings
        Option("debug", bool, default=False, doc=("Enable additional debug tools.")),
    )
    # fmt: on


class SystemFullNameDefaultImpl(SystemFullNameDefault):
    @inject()
    def __call__(self, *, comp: CoreComponent = inject.arg()) -> str:
        return comp.localizer().translate(gettext("NextGIS geoinformation system"))


class SupportUrlImpl(SupportUrl):
    @inject()
    def __call__(self, *, comp: CoreComponent = inject.arg()) -> str | None:
        return comp.options["support_url"]
