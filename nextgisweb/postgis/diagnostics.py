from enum import Enum
from socket import gethostbyname, gaierror

import geoalchemy2 as ga
from sqlalchemy import func, inspect, select, sql
from sqlalchemy.engine import Connection, URL as EngineURL, create_engine
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
from sqlalchemy.exc import OperationalError

from ..feature_layer import FIELD_TYPE
from ..lib.logging import logger

from .util import _, coltype_as_str


# Field type - generic DB type
_FIELD_TYPE_2_DB = {
    FIELD_TYPE.INTEGER: Integer,
    FIELD_TYPE.BIGINT: BigInteger,
    FIELD_TYPE.REAL: Numeric,
    FIELD_TYPE.STRING: String,
    FIELD_TYPE.DATE: Date,
    FIELD_TYPE.TIME: Time,
    FIELD_TYPE.DATETIME: DateTime,
}


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
        schema, table, column_id=None, column_geom=None,
        geometry_type=None, geometry_srid=None, fields=None
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
    def qname(self):
        return sql.quoted_name(self.schema, True) + '.' + sql.quoted_name(self.table, True)

    @property
    def sa_table(self):
        table = sql.table(self.table)
        table.schema = self.schema
        table.quote = True
        table.quote_schema = True

        return table


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

        engine = create_engine(url, client_encoding='utf-8', poolclass=NullPool, connect_args=dict(
            connect_timeout=5))
        try:
            conn = self._conn = engine.connect()
        except OperationalError as exc:
            self.error(_("Failed to connect to the database."))
            return

        self.inject(conn)
        self.success(_("Connected to the database."))

        conn.execute(sql.text("SELECT 1"))
        self.success(_("Executed {} query.").format('SELECT 1'))

        ver = conn.execute(sql.text("SHOW server_version")).scalar().split(' ')[0]
        self.success(_("PostgreSQL version {}.").format(ver))

    def cleanup(self):
        if conn := getattr(self, '_conn', None):
            conn.close()
        super().cleanup()


class PostgisCheck(ConnectionCheck):
    title = _("PostGIS extension")

    def handler(self, conn: Connection):
        ver = conn.execute(sql.text("""
            SELECT extversion FROM pg_extension
            WHERE extname = 'postgis'
        """)).scalar()
        if ver is None:
            self.error(_("PostGIS extension not found."))
        else:
            self.success(_("PostGIS extension version {}.").format(ver))

        gcol_count = conn.execute(sql.text("SELECT COUNT(*) FROM geometry_columns")).scalar()
        self.say(_("Number of geometry columns: {}.").format(gcol_count))

        srs_count = conn.execute(sql.text("SELECT COUNT(*) FROM spatial_ref_sys")).scalar()
        self.say(_("Number of spatial reference systems: {}.").format(srs_count))


class TableInspector:

    def __init__(self, conn, schema, table):
        i = inspect(conn)
        self.columns = {c['name']: c for c in i.get_columns(table, schema)}
        self.pk_constraint = i.get_pk_constraint(table, schema)
        self.indexes = i.get_indexes(table, schema)

    def is_column_primary_key(self, column):
        ccols = self.pk_constraint['constrained_columns']
        return len(ccols) == 1 and ccols[0] == column

    def has_unique_index_on(self, column):
        for idx in self.indexes:
            if (
                idx['unique'] and len(idx['column_names']) == 1
                and idx['column_names'][0] == column
            ):
                return True
        return False


class TableCheck(LayerCheck):
    title = _("Layer table")

    def handler(self, conn: Connection):
        table_type = conn.execute(sql.text("""
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
                sql.text("SELECT has_table_privilege(:qname, :privilege)"),
                qname=self.qname, privilege=priv,
            ).scalar()
            if has_privilege:
                self.success(_("{} privilege is present.").format(priv))
            elif not req:
                self.warning(_("{} privilege is absent.").format(priv))
            else:
                self.error(_("{} privilege is absent.").format(priv))

        count = conn.execute(select(func.count('*')).select_from(self.sa_table)).scalar()
        self.say(_("Number of records: {}.").format(count))

        if self.column_id is None or self.column_geom is None:
            self.error(_("ID or geometry column isn't set."))
            return

        self.inject(TableInspector(conn, self.schema, self.table))


class IdColumnCheck(LayerCheck):
    title = _("ID column")

    def handler(self, conn: Connection, tins: TableInspector):
        cinfo = tins.columns.get(self.column_id)
        if cinfo is None:
            self.error(_("Column not found."))
            return

        ctype_repr = coltype_as_str(cinfo['type'])
        if not isinstance(cinfo['type'], Integer):
            self.error(_("Column found, but has non-integer type - {}.").format(ctype_repr))

        self.success(_("Column found, type is {}.").format(ctype_repr))

        if tins.is_column_primary_key(self.column_id):
            self.success(_("Column is the primary key."))
        else:
            self.say(_("Column is not the primary key."))

            nullable = cinfo['nullable']
            has_unique_index = tins.has_unique_index_on(self.column_id)

            column_id = sql.column(self.column_id)

            if nullable:
                self.warning(_("Column can be NULL."))

                expr = self.sa_table.select().where(column_id.is_(None)).exists().select()
                has_null_values = conn.execute(expr).scalar()
                if has_null_values:
                    self.error(_("NULL values in the column."))
                else:
                    self.success(_("No NULL values in the column."))
            else:
                self.success(_("Column cannot be NULL."))

            if not has_unique_index:
                self.warning(_("Unique index not found."))
            else:
                self.success(_("Unique index found."))

            if not has_unique_index:
                fcount = func.count('*')
                expr = select(column_id, fcount) \
                    .select_from(self.sa_table) \
                    .group_by(column_id) \
                    .having(fcount > 1) \
                    .limit(1) \
                    .exists().select()
                not_unique = conn.execute(expr).scalar()

                if not_unique:
                    self.error(_("Non-unique values in the column."))
                else:
                    self.success(_("All values are unique."))

        ai = cinfo['autoincrement']
        if (isinstance(ai, bool) and ai) or (ai == 'auto'):
            self.success(_("Column is auto-incrementable."))
        else:
            self.warning(_("Column isn't auto-incrementable."))


class GeomColumnCheck(LayerCheck):
    title = _("Geometry column")

    def handler(self, conn: Connection, postgis: PostgisCheck, tins: TableInspector):
        cinfo = tins.columns.get(self.column_geom)
        if cinfo is None:
            self.error(_("Column not found."))
            return

        ctype = cinfo['type']
        ctype_repr = coltype_as_str(ctype).upper().replace(',', ', ')

        if (
            not isinstance(ctype, ga.Geometry)
            or ctype.geometry_type not in ('GEOMETRY', self.geometry_type)
        ):
            self.error(_(
                "Column found, but has an incompatible type - {}."
            ).format(ctype_repr))
        else:
            self.success(_("Column found, type is {}.").format(ctype_repr))

        if ctype.srid != self.geometry_srid:
            self.error(_("Geometry SRID mismatch."))


class ColumnsCheck(LayerCheck):
    title = _("Field columns")

    def handler(self, conn: Connection, tins: TableInspector):
        for field in self.fields:
            cinfo = tins.columns.get(field.column_name)
            if cinfo is None:
                self.error(_("Column of field '{}' not found.").format(field.keyname))
                return

            ctype = cinfo['type']
            ctype_repr = coltype_as_str(ctype).upper().replace(',', ', ')

            type_expected = _FIELD_TYPE_2_DB[field.datatype]
            if not isinstance(ctype, type_expected):
                self.error(_(
                    "Column of field '{}' found, but has an incompatible type - {}."
                ).format(field.keyname, ctype_repr))
            else:
                self.success(_(
                    "Column of field '{}' found, type is {}."
                ).format(field.keyname, ctype_repr))


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
                if issubclass(cls, ColumnsCheck) and 'fields' not in layer:
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
