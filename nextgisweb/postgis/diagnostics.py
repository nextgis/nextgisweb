from enum import Enum
from socket import gethostbyname, gaierror

from sqlalchemy.engine import Connection, URL as EngineURL, create_engine
from sqlalchemy.pool import NullPool
from sqlalchemy.exc import OperationalError
from sqlalchemy.sql import text as sql, quoted_name

from ..lib.logging import logger

from .util import _


class StatusEnum(Enum):
    SUCCESS = 'success'
    WARNING = 'warning'
    ERROR = 'error'

    def __lt__(self, other):
        return (self == SUCCESS and other != SUCCESS) \
            or (self == WARNING and other == ERROR)


SUCCESS = StatusEnum.SUCCESS
WARNING = StatusEnum.WARNING
ERROR = StatusEnum.ERROR


class Check:
    registry = list()

    def __init_subclass__(cls) -> None:
        Check.registry.append(cls)
        return super().__init_subclass__()

    def __init__(self):
        self.status = None
        self.messages = list()
        self.injects = dict()
        self.cleaned = None

    def inject(self, value, key=None):
        if key is None:
            key = type(value)
        self.injects[key] = value

    def say(self, message=None, status=None):
        if status and (self.status is None or self.status < status):
            self.status = status
        if message:
            m = dict()
            if status:
                m['status'] = status
            m['text'] = message
            self.messages.append(m)

    def success(self, message=None):
        self.say(message=message, status=SUCCESS)

    def warning(self, message=None):
        self.say(message=message, status=WARNING)

    def error(self, message=None):
        self.say(message=message, status=ERROR)

    def handler(self, **deps):
        raise NotImplementedError

    def check(self, **deps):
        self.cleaned = False
        try:
            self.handler(**deps)
        except Exception as exc:
            self.error(_("Got an unexpected error."))
            logger.exception("Unexpected check exception")

    def cleanup(self):
        self.cleaned = True

    def __del__(self):
        if self.cleaned is False:
            logger.error("%r wasn't cleaned up" % self)


class ConnectionCheck(Check):
    group = 'connection'

    def __init__(self, *, hostname, port, database, username, password):
        super().__init__()
        self.hostname = hostname
        self.port = port
        self.database = database
        self.username = username
        self.password = password


class LayerCheck(Check):
    group = 'layer'

    def __init__(
        self, *,
        schema, table, column_id, column_geom,
        geometry_type, geometry_srid,
    ):
        super().__init__()
        self.schema = schema
        self.table = table
        self.column_id = column_id
        self.column_geom = column_geom
        self.geometry_type = geometry_type
        self.geometry_srid = geometry_srid


class PostgresCheck(ConnectionCheck):
    title = _("PostgreSQL connection")

    def handler(self):
        try:
            gethostbyname(self.hostname)
        except gaierror as exc:
            self.error(_("Host name resolution failed: {}.").format(
                exc.strerror.lower()))
            return

        url = EngineURL.create(
            'postgresql+psycopg2',
            host=self.hostname, port=self.port, database=self.database,
            username=self.username, password=self.password)

        engine = create_engine(url, poolclass=NullPool, connect_args=dict(
            connect_timeout=5))
        try:
            conn = self._conn = engine.connect()
        except OperationalError as exc:
            self.error(_("Failed to connect to the database."))
            return

        self.inject(conn)
        self.success(_("Connected to the database."))

        conn.execute(sql("SELECT 1"))
        self.success(_("Executed {} query.").format('SELECT 1'))

        ver = conn.execute(sql("SHOW server_version")).scalar().split(' ')[0]
        self.success(_("PostgreSQL version {}.").format(ver))

    def cleanup(self):
        if conn := getattr(self, '_conn', None):
            conn.close()
        super().cleanup()


class PostgisCheck(ConnectionCheck):
    title = _("PostGIS extension")

    def handler(self, conn: Connection):
        ver = conn.execute(sql("""
            SELECT extversion FROM pg_extension
            WHERE extname = 'postgis'
        """)).scalar()
        if ver is None:
            self.error(_("PostGIS extension not found."))
        else:
            self.success(_("PostGIS extension version {}.").format(ver))

        gcol_count = conn.execute("SELECT COUNT(*) FROM geometry_columns").scalar()
        self.say(_("Number of geometry columns: {}.").format(gcol_count))

        srs_count = conn.execute("SELECT COUNT(*) FROM spatial_ref_sys").scalar()
        self.say(_("Number of spatial reference systems: {}.").format(srs_count))


class TableCheck(LayerCheck):
    title = _("Layer table")

    def handler(self, conn: Connection):
        self.qname = quoted_name(self.schema, True) + \
            '.' + quoted_name(self.table, True)

        table_type = conn.execute(sql("""
            SELECT table_type FROM information_schema.tables
            WHERE table_schema = :schema AND table_name = :table
        """), schema=self.schema, table=self.table).scalar()
        if table_type is None:
            self.error(_("Table not found."))
        else:
            self.success(_("Table found, table type is {}.").format(table_type))

        for (priv, req) in (
            ('SELECT', True),
            ('INSERT', False),
            ('UPDATE', False),
            ('DELETE', False),
        ):
            has_privilege = conn.execute(
                sql("SELECT has_table_privilege(:qname, :privilege)"),
                qname=self.qname, privilege=priv,
            ).scalar()
            if has_privilege:
                self.success(_("{} privilege is present.").format(priv))
            elif not req:
                self.warning(_("{} privilege is absent.").format(priv))
            else:
                self.error(_("{} privilege is absent.").format(priv))

        count = conn.execute(sql("SELECT COUNT(*) FROM " + self.qname)).scalar()
        self.say(_("Number of records: {}.").format(count))


class IdColumnCheck(LayerCheck):
    title = _("ID column")

    def handler(self, conn: Connection, tab: TableCheck):
        cinfo = conn.execute(
            sql("""
                SELECT * FROM information_schema.columns
                WHERE table_schema=:schema
                    AND table_name=:table
                    AND column_name=:column
            """),
            schema=self.schema, table=self.table,
            column=self.column_id,
        ).one_or_none()

        if not cinfo:
            self.error(_("Column not found."))
            return

        self.success(_("Column found, type is {}.").format(
            cinfo['data_type'].upper()))

        # * Integer type
        # * Uniqueness
        # * Nullability
        # * Autoincrement or default


class GeomColumnCheck(LayerCheck):
    title = _("Geometry column")

    def handler(self, conn: Connection, postgis: PostgisCheck, tab: TableCheck):
        cinfo = conn.execute(
            sql("""
                SELECT * FROM information_schema.columns
                WHERE table_schema=:schema
                    AND table_name=:table
                    AND column_name=:column
            """),
            schema=self.schema, table=self.table,
            column=self.column_geom,
        ).one_or_none()

        if not cinfo:
            self.error(_("Column not found."))
            return

        data_type = cinfo['data_type'].upper()
        udt_name = cinfo['udt_name'].upper()

        if data_type != 'USER-DEFINED' or udt_name != 'GEOMETRY':
            self.error(_("Column found with invalid type: ({}, {}).").format(
                data_type, udt_name), ERROR)
            return

        self.success(_("Column found, type is {}.").format(udt_name))

        # * More type checks


# TODO: Add fields parameter to LayerChechBase and do field checks here
#
# class ColumnsCheck(LayerCheckBase):
#     title = "Field columns"
#
#     def handler(self, conn: Connection, tab: LayerTableCheck):
#         pass


class Checker:

    def __init__(self, *, connection, layer=None) -> None:
        self.status = None
        self.checks = checks = list()

        for cls in Check.registry:
            if cls in (ConnectionCheck, LayerCheck):
                continue
            elif issubclass(cls, ConnectionCheck):
                ck = cls(**connection)
            elif issubclass(cls, LayerCheck):
                if layer is None:
                    continue
                ck = cls(**layer)
            else:
                raise NotImplementedError
            checks.append(ck)

        self._check()

    def _check(self):
        cleanup = list()
        deps = dict()

        try:
            for ck in self.checks:
                kwargs = dict()
                for k, v in ck.handler.__annotations__.items():
                    try:
                        iv = deps[v]
                    except KeyError:
                        # Missing dependency
                        break
                    else:
                        kwargs[k] = iv
                else:
                    # No dependencies or all deps satisfied
                    cleanup.append(ck)

                    ck.check(**kwargs)
                    if ck.status not in (None, ERROR):
                        deps.update(ck.injects)
                        deps[type(ck)] = ck

                    if ck.status is not None and (
                        self.status is None or self.status < ck.status
                    ):
                        self.status = ck.status
        finally:
            for ck in cleanup:
                ck.cleanup()
