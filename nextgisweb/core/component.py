import io
import multiprocessing
import os
import os.path
import platform
import re
import sys
import tempfile
import uuid
from datetime import datetime, timedelta
from pathlib import Path
from subprocess import check_output

import requests
import sqlalchemy.dialects.postgresql as postgresql
from msgspec import UNSET
from requests.exceptions import JSONDecodeError, RequestException
from sqlalchemy import create_engine, inspect, text
from sqlalchemy.engine.url import URL as EngineURL
from sqlalchemy.engine.url import make_url as make_engine_url
from sqlalchemy.exc import OperationalError
from sqlalchemy.orm import configure_mappers
from sqlalchemy.orm.exc import NoResultFound

from nextgisweb.env import Component, DBSession, _
from nextgisweb.env.package import enable_qualifications, pkginfo
from nextgisweb.lib import db, json
from nextgisweb.lib.config import Option, SizeInBytes
from nextgisweb.lib.logging import logger

from nextgisweb.i18n import Localizer, Translations

from .backup import BackupMetadata
from .model import Setting
from .storage import StorageComponentMixin


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

        # Methods for customization in components
        self.system_full_name_default = self.localizer().translate(
            _("NextGIS geoinformation system")
        )
        self.support_url_view = lambda request: self.options["support_url"]

    def is_service_ready(self):
        while True:
            try:
                sa_url = self._engine_url(error_on_pwfile=True)
                break
            except IOError as exc:
                yield "File [{}] is missing!".format(exc.filename)

        sa_engine = create_engine(
            sa_url,
            connect_args=dict(
                connect_timeout=int(self.options["database.connect_timeout"].total_seconds())
            ),
        )

        while True:
            try:
                with sa_engine.connect():
                    break
            except OperationalError as exc:
                yield str(exc.orig).rstrip()

        sa_engine.dispose()

    def healthcheck(self):
        stat = os.statvfs(self.options["sdir"])

        if (free_space := self.options["healthcheck.free_space"]) > 0:
            if (free_space_current := stat.f_bavail / stat.f_blocks * 100) < free_space:
                return dict(
                    success=False,
                    message="%.2f%% free space left on file storage." % free_space_current,
                )

        if (
            (free_inodes := self.options["healthcheck.free_inodes"]) > 0
            and stat.f_ffree >= 0
            and stat.f_files >= 0  # Not available in some FS
        ):
            if (free_inodes_current := stat.f_ffree / stat.f_files * 100) < free_inodes:
                return dict(
                    success=False,
                    message="%.2f%% free inodes left on file storage." % free_inodes_current,
                )
        try:
            with tempfile.TemporaryFile(dir=self.options["sdir"]):
                pass
        except IOError:
            return dict(success=False, message="Could not create a file on file storage.")

        try:
            sa_url = self._engine_url(error_on_pwfile=True)
        except IOError:
            return dict(success=False, message="Database password file is missing!")

        sa_engine = create_engine(
            sa_url,
            connect_args=dict(
                connect_timeout=int(self.options["database.connect_timeout"].total_seconds())
            ),
        )

        try:
            with sa_engine.connect() as conn:
                conn.execute(text("SELECT 1"))
        except OperationalError as exc:
            msg = str(exc.orig).rstrip()
            return dict(success=False, message="Database connection failed: " + msg)

        sa_engine.dispose()

        if (
            (delta := self.options["backup.interval"]) is not None
            and (last := self.settings_get(self.identity, "last_backup", None)) is not None
            and (datetime.utcnow() - datetime.fromisoformat(last)) > delta
        ):
            return dict(success=False, message="Backup has not been performed on time.")

        if (
            (delta := self.options["maintenance.interval"]) is not None
            and (last := self.settings_get(self.identity, "last_maintenance", None)) is not None
            and (datetime.utcnow() - datetime.fromisoformat(last)) > delta
        ):
            return dict(success=False, message="Maintenance has not been performed on time.")

        return dict(success=True)

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
            raise IOError("Invalid base directory path")

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
            db.exists().where(db.and_(Setting.component == component, Setting.name == name))
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

    def sys_info(self):
        result = []

        def try_check_output(cmd):
            try:
                return check_output(cmd, universal_newlines=True).strip()
            except Exception:
                msg = "Failed to get sys info with command: '%s'" % " ".join(cmd)
                logger.error(msg, exc_info=True)

        result.append((_("Linux kernel"), platform.release()))
        os_distribution = try_check_output(["lsb_release", "-ds"])
        if os_distribution is not None:
            result.append((_("OS distribution"), os_distribution))

        def get_cpu_model():
            cpuinfo = try_check_output(["cat", "/proc/cpuinfo"])
            if cpuinfo is not None:
                for line in cpuinfo.split("\n"):
                    if line.startswith("model name"):
                        match = re.match(r"model name\s*:?(.*)", line)
                        return match.group(1).strip()
            return platform.processor()

        cpu_model = re.sub(r"\(?(TM|R)\)", "", get_cpu_model())
        result.append((_("CPU"), "{} × {}".format(multiprocessing.cpu_count(), cpu_model)))

        mem_bytes = os.sysconf("SC_PAGE_SIZE") * os.sysconf("SC_PHYS_PAGES")
        result.append((_("RAM"), "%d MB" % (float(mem_bytes) / 2**20)))

        result.append(("Python", ".".join(map(str, sys.version_info[0:3]))))

        postgres_version = DBSession.scalar(text("SHOW server_version"))
        postgres_version = re.sub(r"\s\(.*\)$", "", postgres_version)

        sql_extra = """
            SELECT datcollate, datctype FROM pg_database
            WHERE datname = current_database()
        """
        postgres_extra = list(DBSession.execute(text(sql_extra)).first())

        sql_postgrespro = "SELECT EXISTS(SELECT * FROM pg_proc WHERE proname = 'pgpro_edition')"
        if DBSession.scalar(text(sql_postgrespro)):
            postgrespro_edition = DBSession.scalar(text("SELECT pgpro_edition()"))
            postgres_extra.append(f"Postgres Pro {postgrespro_edition.capitalize()}")

        result.append(("PostgreSQL", f"{postgres_version} ({', '.join(postgres_extra)})"))

        postgis_version = DBSession.scalar(text("SELECT PostGIS_Lib_Version()"))
        result.append(("PostGIS", postgis_version))

        gdal_version = try_check_output(["gdal-config", "--version"])
        if gdal_version is not None:
            result.append(("GDAL", gdal_version))

        return result

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

    def query_stat(self):
        result = dict()
        result["full_name"] = self.system_full_name()
        fs_size = 0
        for root, dirs, files in os.walk(self.options["sdir"]):
            for f in files:
                fs_size += os.stat(os.path.join(root, f), follow_symlinks=False).st_size
        result["filesystem_size"] = fs_size
        result["database_size"] = DBSession.query(
            db.func.pg_database_size(
                db.func.current_database(),
            )
        ).scalar()
        if self.options["storage.enabled"]:
            result["storage"] = self.query_storage()

        return result

    def system_full_name(self):
        try:
            return self.settings_get(self.identity, "system.full_name")
        except KeyError:
            return self.system_full_name_default

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
                with io.open(opt_db["pwfile"]) as fd:
                    con_args["password"] = fd.read().rstrip()
            except IOError:
                if error_on_pwfile:
                    raise
        return con_args

    def _engine_url(self, error_on_pwfile=False):
        con_args = self._db_connection_args(error_on_pwfile=error_on_pwfile)
        return make_engine_url(EngineURL.create("postgresql+psycopg2", **con_args))

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
                    relfn, datetime.strptime(str(relfn), backup_filename), fn.stat().st_size
                )
            )
        result = sorted(result, key=lambda x: x.timestamp, reverse=True)
        return result

    def backup_filename(self, filename):
        return os.path.join(self.options["backup.path"], filename)

    def check_integrity(self):
        metadata = self.env.metadata()
        metadata.bind = self.engine
        inspector = inspect(self.engine)

        def ct_compile(coltype, _dialect=postgresql.dialect()):
            return coltype.compile(_dialect)

        for tab in metadata.tables.values():
            tab_name, tab_schema = tab.name, tab.schema
            tab_repr = (f"{tab_schema}." if tab_schema else "") + tab_name
            tab_msg = f"Table '{tab_repr}'"

            if not inspector.has_table(tab_name, tab_schema):
                yield f"Table '{tab_repr}' not found."
                continue

            cols_act = {c["name"]: c for c in inspector.get_columns(tab_name, tab_schema)}
            type_remap = {"FLOAT": "DOUBLE PRECISION", "DECIMAL": "NUMERIC"}

            for col_exp in tab.columns:
                col_msg = f"{tab_msg}, column '{col_exp.name}'"

                if col_act := cols_act.pop(col_exp.name, None):
                    type_exp = col_exp.type
                    type_act = col_act["type"]

                    sql_exp = ct_compile(type_exp)
                    sql_exp = type_remap.get(sql_exp, sql_exp)
                    sql_act = ct_compile(type_act)

                    if sql_act != sql_exp:
                        yield f"{col_msg}: type mismatch ({sql_exp} <> {sql_act})."
                else:
                    yield f"{col_msg}: not found."

            if len(cols_act) > 0:
                yield f"{tab_msg}: extra columns found ({', '.join(cols_act.keys())})."

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
        Option("provision.instance_id", default=None),
        Option("provision.system.title", default=None),
        Option("maintenance.interval", timedelta, default=None, doc=(
            "Planned maintenance interval, if exceeded, heathcheck will fail.")),
        # Debug settings
        Option("debug", bool, default=False, doc=("Enable additional debug tools.")),
    )
    # fmt: on
