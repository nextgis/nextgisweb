from enum import Enum
from socket import gethostbyname, gaierror

import geoalchemy2 as ga
from sqlalchemy import inspect
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
from sqlalchemy.sql import text as sql, quoted_name

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
        return quoted_name(self.schema, True) + '.' + quoted_name(self.table, True)


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


class ColumnInfo(dict):
    pass


class TableCheck(LayerCheck):
    title = _("Layer table")

    def handler(self, conn: Connection):
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

        inspector = inspect(conn)

        column_info = ColumnInfo()
        for column in inspector.get_columns(self.table, self.schema):
            column_info[column['name']] = column
        self.inject(column_info)

        pk_info = inspector.get_pk_constraint(self.table, self.schema)
        self.inject(pk_info, 'PKInfo')

        index_info = inspector.get_indexes(self.table, self.schema)
        self.inject(index_info, 'IndexInfo')


class IdColumnCheck(LayerCheck):
    title = _("ID column")

    def handler(
        self, conn: Connection, tab: TableCheck, column_info: ColumnInfo,
        pk_info: 'PKInfo', index_info: 'IndexInfo'
    ):
        if self.column_id is not None:
            if not (cinfo := column_info.get(self.column_id)):
                self.error(_("Column not found."))
                return
            self.success(_("Column found."))

            type_msg = _("Type is {}.").format(coltype_as_str(cinfo['type']))
            if not isinstance(cinfo['type'], Integer):
                self.error(type_msg)
                return
            self.success(type_msg)

            if (
                len(pk_info['constrained_columns']) == 1
                and pk_info['constrained_columns'][0] == self.column_id
            ):
                self.success(_("Is primary key."))
            else:
                self.say(_("Not a primary key."))

                if cinfo['nullable']:
                    self.warning(_("Can be NULL."))
                else:
                    self.success(_("Can't be NULL."))

                def has_unique_index(cname):
                    for i in index_info:
                        if (
                            i['unique'] and len(i['column_names']) == 1
                            and i['column_names'][0] == cname
                        ):
                            return True
                    return False

                if not cinfo['nullable'] and has_unique_index(self.column_id):
                    is_unique = True
                else:
                    qname_cid = quoted_name(self.column_id, True)
                    is_unique = conn.execute(sql(f"""
                        SELECT EXISTS (
                            SELECT {qname_cid}, count(*) FROM {self.qname}
                            GROUP BY {qname_cid} HAVING count(*) > 1 LIMIT 1
                        )
                    """))

                if is_unique:
                    self.success(_("Is unique."))
                else:
                    self.error(_("Is not unique."))
                    return

            ai = cinfo['autoincrement']
            if (isinstance(ai, bool) and ai) or (ai == 'auto'):
                self.success(_("Has autoincrement."))
            else:
                self.warning(_("Has no autoincrement."))


class GeomColumnCheck(LayerCheck):
    title = _("Geometry column")

    def handler(
        self, conn: Connection, postgis: PostgisCheck, tab: TableCheck,
        column_info: ColumnInfo
    ):
        if self.column_geom is not None:
            if not (cinfo := column_info.get(self.column_geom)):
                self.error(_("Column not found."))
                return
            self.success(_("Column found."))

            type_msg = _("Type is {}.").format(coltype_as_str(cinfo['type']))
            ctype = cinfo['type']
            if not isinstance(ctype, ga.Geometry):
                self.error(type_msg)
                return
            elif ctype.geometry_type not in ('GEOMETRY', self.geometry_type):
                self.error(type_msg + " " + _("Geometry type mismatch."))
                return
            elif ctype.srid != self.geometry_srid:
                self.error(type_msg + " " + _("Geometry SRID mismatch."))
                return
            self.success(type_msg)


class ColumnsCheck(LayerCheck):
    title = _("Field columns")

    def handler(self, conn: Connection, tab: TableCheck, column_info: ColumnInfo):
        for field in self.fields:
            if not (cinfo := column_info.get(field.column_name)):
                self.error(_("Column {} not found.").format(field.column_name))
                return
            col_msg = _("Column {} found.").format(field.column_name)
            type_expected = _FIELD_TYPE_2_DB[field.datatype]
            if not isinstance(cinfo['type'], type_expected):
                self.success(col_msg)
                self.error("Column {} type {} does not match {} base type.".format(
                    field.column_name, coltype_as_str(cinfo['type']),
                    coltype_as_str(type_expected())))
                return
            else:
                col_msg += " " + _("Type is {}.").format(coltype_as_str(cinfo['type']))
                self.success(col_msg)


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
