from enum import Enum
from socket import gaierror, gethostbyname

import geoalchemy2 as ga
from sqlalchemy import func, inspect, select, sql
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.engine import URL as EngineURL
from sqlalchemy.engine import Connection, create_engine
from sqlalchemy.exc import OperationalError, SQLAlchemyError
from sqlalchemy.pool import NullPool
from sqlalchemy.types import (
    BigInteger,
    Date,
    DateTime,
    Integer,
    Numeric,
    String,
    Time,
)

from nextgisweb.env import gettext, gettextf
from nextgisweb.lib.logging import logger

from nextgisweb.feature_layer import FIELD_TYPE

from .util import coltype_as_str

# Field type - generic DB type
_FIELD_TYPE_2_DB = {
    FIELD_TYPE.INTEGER: Integer,
    FIELD_TYPE.BIGINT: BigInteger,
    FIELD_TYPE.REAL: Numeric,
    FIELD_TYPE.STRING: (String, UUID),
    FIELD_TYPE.DATE: Date,
    FIELD_TYPE.TIME: Time,
    FIELD_TYPE.DATETIME: DateTime,
}


class StatusEnum(Enum):
    SUCCESS = "success"
    WARNING = "warning"
    ERROR = "error"

    def __lt__(self, other):
        return (self == SUCCESS and other != SUCCESS) or (self == WARNING and other == ERROR)


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
                m["status"] = status
            m["text"] = message
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
        except Exception:
            self.error(gettext("Got an unexpected error."))
            logger.exception("Unexpected check exception")

    def cleanup(self):
        self.cleaned = True

    def __del__(self):
        if self.cleaned is False:
            logger.error("%r wasn't cleaned up" % self)


class ConnectionCheck(Check):
    group = "connection"

    def __init__(self, *, hostname, port, database, username, password, sslmode):
        super().__init__()
        self.hostname = hostname
        self.port = port
        self.database = database
        self.username = username
        self.password = password
        self.sslmode = sslmode


class LayerCheck(Check):
    group = "layer"

    def __init__(
        self,
        *,
        schema,
        table,
        column_id=None,
        column_geom=None,
        geometry_type=None,
        geometry_srid=None,
        fields=None,
    ):
        super().__init__()
        self.schema = schema
        self.table = table
        self.column_id = column_id
        self.column_geom = column_geom
        self.geometry_type = geometry_type
        self.geometry_srid = geometry_srid
        self.fields = fields

    @property
    def sa_table(self):
        table = sql.table(self.table)
        table.schema = self.schema
        table.quote = True
        table.quote_schema = True

        return table


class PostgresCheck(ConnectionCheck):
    title = gettext("PostgreSQL connection")

    def handler(self):
        try:
            gethostbyname(self.hostname)
        except gaierror as exc:
            self.error(gettextf("Host name resolution failed: {}.")(exc.strerror.lower()))
            return

        url = EngineURL.create(
            "postgresql+psycopg2",
            host=self.hostname,
            port=self.port,
            database=self.database,
            username=self.username,
            password=self.password,
        )

        connect_args = dict(connect_timeout=5)
        if self.sslmode is not None:
            connect_args["sslmode"] = self.sslmode.value
        engine = create_engine(
            url, client_encoding="utf-8", poolclass=NullPool, connect_args=connect_args
        )
        try:
            conn = self._conn = engine.connect()
        except OperationalError:
            self.error(gettext("Failed to connect to the database."))
            return

        self.inject(conn)
        self.success(gettext("Connected to the database."))

        conn.execute(sql.text("SELECT 1"))
        self.success(gettextf("Executed {} query.")("SELECT 1"))

        ver = conn.execute(sql.text("SHOW server_version")).scalar().split(" ")[0]
        self.success(gettextf("PostgreSQL version {}.")(ver))

        ssl = conn.execute(
            sql.text("SELECT ssl FROM pg_stat_ssl WHERE pid = pg_backend_pid()")
        ).scalar()
        self.say(gettext("SSL is used.") if ssl else gettext("SSL is not used."))

    def cleanup(self):
        if conn := getattr(self, "_conn", None):
            conn.close()
        super().cleanup()


class PostgisCheck(ConnectionCheck):
    title = gettext("PostGIS extension")

    def handler(self, conn: Connection):
        # fmt: off
        ver = conn.execute(sql.text("""
            SELECT extversion FROM pg_extension
            WHERE extname = 'postgis'
        """)).scalar()
        # fmt: on
        if ver is None:
            self.error(gettext("PostGIS extension not found."))
        else:
            self.success(gettextf("PostGIS extension version {}.")(ver))

        gcol_count = conn.execute(sql.text("SELECT COUNT(*) FROM geometry_columns")).scalar()
        self.say(gettextf("Number of geometry columns: {}.")(gcol_count))

        srs_count = conn.execute(sql.text("SELECT COUNT(*) FROM spatial_ref_sys")).scalar()
        self.say(gettextf("Number of spatial reference systems: {}.")(srs_count))


class TableNotExists(Exception):
    pass


class TableInspector:
    def __init__(self, conn, schema, table):
        i = inspect(conn)
        if not i.has_table(table, schema):
            raise TableNotExists()

        # fmt: off
        self.table_type = conn.execute(sql.text("""
            SELECT table_type FROM information_schema.tables
            WHERE table_schema = :schema AND table_name = :table
        """), dict(schema=schema, table=table)).scalar()
        # fmt: on

        self.columns = {c["name"]: c for c in i.get_columns(table, schema)}
        self.pk_constraint = i.get_pk_constraint(table, schema)
        self.indexes = i.get_indexes(table, schema)

    def is_column_primary_key(self, column):
        ccols = self.pk_constraint["constrained_columns"]
        return len(ccols) == 1 and ccols[0] == column

    def has_unique_index_on(self, column):
        for idx in self.indexes:
            if (
                idx["unique"]
                and len(idx["column_names"]) == 1
                and idx["column_names"][0] == column
            ):
                return True
        return False


class TableCheck(LayerCheck):
    title = gettext("Layer table")

    def handler(self, conn: Connection):
        try:
            tins = TableInspector(conn, self.schema, self.table)
        except TableNotExists:
            self.error(gettext("Table not found."))
            return
        self.success(gettextf("Table found, table type is {}.")(tins.table_type))

        sql_has_privilege = """
            SELECT has_table_privilege(
                quote_ident(:schema) || '.' || quote_ident(:table), :privilege)
        """

        for priv, req in (
            ("SELECT", True),
            ("INSERT", False),
            ("UPDATE", False),
            ("DELETE", False),
        ):
            has_privilege = conn.execute(
                sql.text(sql_has_privilege),
                dict(schema=self.schema, table=self.table, privilege=priv),
            ).scalar()
            if has_privilege:
                self.success(gettextf("{} privilege is present.")(priv))
            elif not req:
                self.warning(gettextf("{} privilege is absent.")(priv))
            else:
                self.error(gettextf("{} privilege is absent.")(priv))

        count = conn.execute(select(func.count("*")).select_from(self.sa_table)).scalar()
        self.say(gettextf("Number of records: {}.")(count))

        if self.column_id is None or self.column_geom is None:
            self.error(gettext("ID or geometry column isn't set."))
            return

        self.inject(tins)


class IdColumnCheck(LayerCheck):
    title = gettext("ID column")

    def handler(self, conn: Connection, tins: TableInspector):
        cinfo = tins.columns.get(self.column_id)
        if cinfo is None:
            self.error(gettext("Column not found."))
            return

        ctype_repr = coltype_as_str(cinfo["type"])
        if not isinstance(cinfo["type"], Integer):
            self.error(gettextf("Column found, but has non-integer type - {}.")(ctype_repr))

        self.success(gettextf("Column found, type is {}.")(ctype_repr))

        is_table = tins.table_type == "BASE TABLE"

        if is_table and tins.is_column_primary_key(self.column_id):
            self.success(gettext("Column is the primary key."))
        else:
            if is_table:
                self.say(gettext("Column is not the primary key."))

            nullable = cinfo["nullable"]
            has_unique_index = is_table and tins.has_unique_index_on(self.column_id)

            column_id = sql.column(self.column_id)

            if nullable:
                if is_table:
                    self.warning(gettext("Column can be NULL."))

                expr = self.sa_table.select().where(column_id.is_(None)).exists().select()
                has_null_values = conn.execute(expr).scalar()
                if has_null_values:
                    self.error(gettext("NULL values in the column."))
                else:
                    self.success(gettext("No NULL values in the column."))
            else:
                self.success(gettext("Column cannot be NULL."))

            if is_table:
                if not has_unique_index:
                    self.warning(gettext("Unique index not found."))
                else:
                    self.success(gettext("Unique index found."))

            if not has_unique_index:
                fcount = func.count("*")
                expr = (
                    select(column_id, fcount)
                    .select_from(self.sa_table)
                    .group_by(column_id)
                    .having(fcount > 1)
                    .limit(1)
                    .exists()
                    .select()
                )
                not_unique = conn.execute(expr).scalar()

                if not_unique:
                    self.error(gettext("Non-unique values in the column."))
                else:
                    self.success(gettext("All values are unique."))

        if is_table:
            ai = cinfo["autoincrement"]
            if (isinstance(ai, bool) and ai) or (ai == "auto"):
                self.success(gettext("Column is auto-incrementable."))
            else:
                self.warning(gettext("Column isn't auto-incrementable."))


class GeomColumnCheck(LayerCheck):
    title = gettext("Geometry column")

    def handler(self, conn: Connection, postgis: PostgisCheck, tins: TableInspector):
        cinfo = tins.columns.get(self.column_geom)
        if cinfo is None:
            self.error(gettext("Column not found."))
            return

        ctype = cinfo["type"]
        ctype_repr = coltype_as_str(ctype).upper().replace(",", ", ")

        if not isinstance(ctype, ga.Geometry) or ctype.geometry_type not in (
            "GEOMETRY",
            self.geometry_type,
        ):
            self.error(gettextf("Column found, but has an incompatible type - {}.")(ctype_repr))
            return
        else:
            self.success(gettextf("Column found, type is {}.")(ctype_repr))

        if ctype.srid != self.geometry_srid:
            self.error(gettext("Geometry SRID mismatch."))

        for srid in (ctype.srid, *(s for s in (3857, 4326) if s != ctype.srid)):
            expr = sql.column(self.column_geom)
            if ctype.srid != srid:
                expr = func.st_transform(func.st_setsrid(expr, ctype.srid), srid)
            expr = select(func.st_extent(expr)).select_from(self.sa_table).scalar_subquery()
            expr = select(
                func.st_xmin(expr), func.st_ymin(expr), func.st_xmax(expr), func.st_ymax(expr)
            )
            try:
                extent = conn.execute(expr).one()
            except SQLAlchemyError:
                if ctype.srid == srid:
                    raise
                self.error(gettextf("Failed to reproject extent to SRID {}.")(srid))
                continue

            if extent[0] is None:
                extent_str = "NULL"
            else:
                extent_str = ", ".join("{:.4f}".format(c) for c in extent)
            self.say(gettextf("Extent (SRID {}): {}.")(srid, extent_str))


class ColumnsCheck(LayerCheck):
    title = gettext("Field columns")

    def handler(self, conn: Connection, tins: TableInspector):
        for field in self.fields:
            cinfo = tins.columns.get(field.column_name)
            if cinfo is None:
                self.error(gettextf("Column of field '{}' not found.")(field.keyname))
                return

            ctype = cinfo["type"]
            ctype_repr = coltype_as_str(ctype).upper().replace(",", ", ")

            type_expected = _FIELD_TYPE_2_DB[field.datatype]
            if not isinstance(ctype, type_expected):
                self.error(
                    gettextf("Column of field '{}' found, but has an incompatible type - {}.")(
                        field.keyname, ctype_repr
                    )
                )
            else:
                self.success(
                    gettextf("Column of field '{}' found, type is {}.")(field.keyname, ctype_repr)
                )


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
                if issubclass(cls, ColumnsCheck) and "fields" not in layer:
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

                    if ck.status is not None and (self.status is None or self.status < ck.status):
                        self.status = ck.status
        finally:
            for ck in cleanup:
                ck.cleanup()
