import re
from contextlib import contextmanager
from enum import Enum
from typing import Literal

import sqlalchemy as sa
import sqlalchemy.event as sa_event
import sqlalchemy.orm as orm
from msgspec import UNSET
from shapely.geometry import box
from sqlalchemy import alias, bindparam, cast, func, select, sql, text
from sqlalchemy import and_ as sql_and
from sqlalchemy import or_ as sql_or
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.exc import NoSuchTableError, OperationalError, SQLAlchemyError
from zope.interface import implementer

from nextgisweb.env import Base, env, gettext
from nextgisweb.lib import saext
from nextgisweb.lib.geometry import Geometry
from nextgisweb.lib.logging import logger
from nextgisweb.lib.saext import postgres_url

from nextgisweb.core.exception import ForbiddenError, ValidationError
from nextgisweb.feature_layer import (
    FIELD_TYPE,
    GEOM_TYPE,
    Feature,
    FeatureQueryIntersectsMixin,
    FeatureSet,
    FeaureLayerGeometryType,
    IFeatureLayer,
    IFeatureQuery,
    IFeatureQueryFilter,
    IFeatureQueryFilterBy,
    IFeatureQueryIlike,
    IFeatureQueryIntersects,
    IFeatureQueryLike,
    IFeatureQueryOrderBy,
    IFilterableFeatureLayer,
    IWritableFeatureLayer,
    LayerField,
    LayerFieldsMixin,
)
from nextgisweb.feature_layer.filter import FilterParser
from nextgisweb.layer import IBboxLayer, SpatialLayerMixin
from nextgisweb.resource import (
    ConnectionScope,
    CRUTypes,
    DataScope,
    Resource,
    ResourceGroup,
    ResourceScope,
    SAttribute,
    SColumn,
    Serializer,
    SRelationship,
    SResource,
)
from nextgisweb.spatial_ref_sys import SRS

from .exception import ExternalDatabaseError

Base.depends_on("resource", "feature_layer")

st_force2d = func.st_force2d
st_transform = func.st_transform
st_extent = func.st_extent
st_setsrid = func.st_setsrid
st_xmax = func.st_xmax
st_xmin = func.st_xmin
st_ymax = func.st_ymax
st_ymin = func.st_ymin

geom_wkb_lr = text("ST_Transform(ST_GeomFromWKB(:wkb, :lsrs), :rsrs)")


GEOM_TYPE_DISPLAY = (
    gettext("Point"),
    gettext("Line"),
    gettext("Polygon"),
    gettext("Multipoint"),
    gettext("Multiline"),
    gettext("Multipolygon"),
    gettext("Point Z"),
    gettext("Line Z"),
    gettext("Polygon Z"),
    gettext("Multipoint Z"),
    gettext("Multiline Z"),
    gettext("Multipolygon Z"),
)


def calculate_extent(layer, where=None, geomcol=None):
    tab = layer._sa_table(True)

    where_geom_exist = not (where is None and geomcol is None) and len(where) > 0
    geomcol = geomcol if where_geom_exist else getattr(tab.columns, layer.column_geom)

    # TODO: Why do we use ST_SetSRID(ST_Force2D(...), ...) here?
    extent_fn = st_extent(st_transform(st_setsrid(st_force2d(geomcol), layer.geometry_srid), 4326))

    if where_geom_exist:
        bbox = sql.select(extent_fn).where(sa.and_(True, *where)).label("bbox")
    else:
        bbox = extent_fn.label("bbox")

    sq = select(bbox).subquery()

    fields = (
        st_xmax(sq.c.bbox),
        st_xmin(sq.c.bbox),
        st_ymax(sq.c.bbox),
        st_ymin(sq.c.bbox),
    )

    with layer.connection.get_connection() as conn:
        maxLon, minLon, maxLat, minLat = conn.execute(select(*fields)).first()

    extent = dict(minLon=minLon, maxLon=maxLon, minLat=minLat, maxLat=maxLat)

    return extent


class SSLMode(Enum):
    disable = "disable"
    allow = "allow"
    prefer = "prefer"
    require = "require"
    verify_ca = "verify-ca"
    verify_full = "verify-full"


class PostgisConnection(Base, Resource):
    identity = "postgis_connection"
    cls_display_name = gettext("PostGIS connection")

    __scope__ = ConnectionScope

    hostname = sa.Column(sa.Unicode, nullable=False)
    database = sa.Column(sa.Unicode, nullable=False)
    username = sa.Column(sa.Unicode, nullable=False)
    password = sa.Column(sa.Unicode, nullable=False)
    port = sa.Column(sa.Integer, nullable=True)
    sslmode = sa.Column(saext.Enum(SSLMode), nullable=True)

    @classmethod
    def check_parent(cls, parent):
        return isinstance(parent, ResourceGroup)

    def get_engine(self):
        comp = env.postgis

        # Need to check connection params to see if
        # they changed for each connection request
        credhash = (
            self.hostname,
            self.port,
            self.sslmode,
            self.database,
            self.username,
            self.password,
        )

        if self.id in comp._engine:
            engine = comp._engine[self.id]

            if engine._credhash == credhash:
                return engine

            else:
                del comp._engine[self.id]

        connect_timeout = int(comp.options["connect_timeout"].total_seconds())
        statement_timeout_ms = int(comp.options["statement_timeout"].total_seconds()) * 1000
        args = dict(
            client_encoding="utf-8",
            connect_args=dict(
                connect_timeout=connect_timeout,
                options="-c statement_timeout=%d" % statement_timeout_ms,
            ),
        )
        if self.sslmode is not None:
            args["connect_args"]["sslmode"] = self.sslmode.value

        engine_url = postgres_url(
            host=self.hostname,
            port=self.port,
            database=self.database,
            username=self.username,
            password=self.password,
        )
        engine = sa.create_engine(engine_url, **args)

        resid = self.id

        @sa_event.listens_for(engine, "connect")
        def _connect(dbapi, record):
            logger.debug(
                "Resource #%d, pool 0x%x, connection 0x%x created", resid, id(dbapi), id(engine)
            )

        @sa_event.listens_for(engine, "checkout")
        def _checkout(dbapi, record, proxy):
            logger.debug(
                "Resource #%d, pool 0x%x, connection 0x%x retrieved", resid, id(dbapi), id(engine)
            )

        @sa_event.listens_for(engine, "checkin")
        def _checkin(dbapi, record):
            logger.debug(
                "Resource #%d, pool 0x%x, connection 0x%x returned", resid, id(dbapi), id(engine)
            )

        engine._credhash = credhash

        comp._engine[self.id] = engine
        return engine

    @contextmanager
    def get_connection(self):
        try:
            conn = self.get_engine().connect()
        except OperationalError:
            raise ValidationError(gettext("Cannot connect to the database!"))

        try:
            yield conn
        except SQLAlchemyError as exc:
            raise ExternalDatabaseError(sa_error=exc)
        finally:
            conn.close()


class SSLModeAttr(SColumn):
    ctypes = CRUTypes(SSLMode | None, SSLMode | None, SSLMode | None)


class PostgisConnectionSerializer(Serializer, resource=PostgisConnection):
    hostname = SColumn(read=ConnectionScope.read, write=ConnectionScope.write)
    port = SColumn(read=ConnectionScope.read, write=ConnectionScope.write)
    sslmode = SSLModeAttr(read=ConnectionScope.read, write=ConnectionScope.write)
    username = SColumn(read=ConnectionScope.read, write=ConnectionScope.write)
    password = SColumn(read=ConnectionScope.read, write=ConnectionScope.write)
    database = SColumn(read=ConnectionScope.read, write=ConnectionScope.write)


class PostgisLayerField(Base, LayerField):
    identity = "postgis_layer"

    __tablename__ = LayerField.__tablename__ + "_" + identity
    __mapper_args__ = dict(polymorphic_identity=identity)

    id = sa.Column(sa.ForeignKey(LayerField.id), primary_key=True)
    column_name = sa.Column(sa.Unicode, nullable=False)


@implementer(IFeatureLayer, IFilterableFeatureLayer, IWritableFeatureLayer, IBboxLayer)
class PostgisLayer(Base, Resource, SpatialLayerMixin, LayerFieldsMixin):
    identity = "postgis_layer"
    cls_display_name = gettext("PostGIS layer")

    __scope__ = DataScope

    connection_id = sa.Column(sa.ForeignKey(Resource.id), nullable=False)
    schema = sa.Column(sa.Unicode, default="public", nullable=False)
    table = sa.Column(sa.Unicode, nullable=False)
    column_id = sa.Column(sa.Unicode, nullable=False)
    column_geom = sa.Column(sa.Unicode, nullable=False)
    geometry_type = sa.Column(saext.Enum(*GEOM_TYPE.enum), nullable=False)
    geometry_srid = sa.Column(sa.Integer, nullable=False)

    __field_class__ = PostgisLayerField

    connection = orm.relationship(
        Resource,
        foreign_keys=connection_id,
        cascade="save-update, merge",
    )

    @classmethod
    def check_parent(cls, parent):
        return isinstance(parent, ResourceGroup)

    @property
    def source(self):
        source_meta = super().source
        source_meta.update(
            dict(
                schema=self.schema,
                table=self.table,
                column_id=self.column_id,
                column_geom=self.column_geom,
                geometry_type=self.geometry_type,
            )
        )
        return source_meta

    def setup(self):
        fdata = dict()
        for f in self.fields:
            fdata[f.keyname] = dict(
                (k, getattr(f, k))
                for k in (
                    "display_name",
                    "grid_visibility",
                    "lookup_table_id",
                )
            )

        for f in list(self.fields):
            self.fields.remove(f)

        self.feature_label_field = None

        with self.connection.get_connection() as conn:
            inspector = sa.inspect(conn.engine)
            try:
                columns = inspector.get_columns(self.table, self.schema)
            except NoSuchTableError:
                raise ValidationError(
                    gettext("Table '%(table)s' not found!")
                    % dict(table=f"{self.schema}.{self.table}")
                )

            # fmt: off
            result = conn.execute(text(
                """SELECT type, coord_dimension, srid FROM geometry_columns
                WHERE f_table_schema = :s
                    AND f_table_name = :t
                    AND f_geometry_column = :column
            """), dict(s=self.schema, t=self.table, column=self.column_geom))
            # fmt: on

            if row := result.mappings().first():
                geometry_srid = row["srid"]

                if geometry_srid == 0 and self.geometry_srid is None:
                    raise ValidationError(
                        gettext(
                            "SRID missing in geometry_columns table! You should specify it manually."
                        )
                    )

                if self.geometry_srid == 0:
                    raise ValidationError(gettext("0 is an invalid SRID."))

                if (
                    self.geometry_srid is not None
                    and geometry_srid != 0
                    and self.geometry_srid != geometry_srid
                ):
                    raise ValidationError(
                        gettext("SRID in geometry_columns table does not match specified!")
                    )

                if self.geometry_srid is None:
                    self.geometry_srid = geometry_srid

                tab_geom_type = row["type"]

                if tab_geom_type == "GEOMETRY":
                    if self.geometry_type is None:
                        raise ValidationError(
                            gettext(
                                "Geometry type missing in geometry_columns table! You should specify it manually."
                            )
                        )
                else:
                    if row["coord_dimension"] == 3:
                        tab_geom_type += "Z"

                    if self.geometry_type is None:
                        self.geometry_type = tab_geom_type
                    elif tab_geom_type != self.geometry_type:
                        raise ValidationError(
                            gettext(
                                "Geometry type in geometry_columns table does not match specified!"
                            )
                        )

            colfound_id = False
            colfound_geom = False

            for column in columns:
                if column["name"] == self.column_id:
                    if not isinstance(column["type"], sa.Integer):
                        raise ValidationError(
                            gettext("To use column as ID it should have integer type!")
                        )
                    colfound_id = True

                elif column["name"] == self.column_geom:
                    colfound_geom = True

                else:
                    if isinstance(column["type"], sa.BigInteger):
                        datatype = FIELD_TYPE.BIGINT
                    elif isinstance(column["type"], sa.Integer):
                        datatype = FIELD_TYPE.INTEGER
                    elif isinstance(column["type"], sa.Numeric):
                        datatype = FIELD_TYPE.REAL
                    elif isinstance(column["type"], (sa.String, UUID)):
                        datatype = FIELD_TYPE.STRING
                    elif isinstance(column["type"], sa.Date):
                        datatype = FIELD_TYPE.DATE
                    elif isinstance(column["type"], sa.Time):
                        datatype = FIELD_TYPE.TIME
                    elif isinstance(column["type"], sa.DateTime):
                        datatype = FIELD_TYPE.DATETIME
                    else:
                        logger.warning(f"Column type '{column['type']}' is not supported.")
                        continue

                    fopts = dict(display_name=column["name"])
                    if prev := fdata.get(column["name"]):
                        fopts.update(prev)
                    self.fields.append(
                        PostgisLayerField(
                            keyname=column["name"],
                            datatype=datatype,
                            column_name=column["name"],
                            **fopts,
                        )
                    )

            if not colfound_id:
                raise ValidationError(
                    gettext("Column '%(column)s' not found!") % dict(column=self.column_id)
                )

            if not colfound_geom:
                raise ValidationError(
                    gettext("Column '%(column)s' not found!") % dict(column=self.column_geom)
                )

    def get_info(self):
        return super().get_info() + (
            (
                gettext("Geometry type"),
                dict(zip(GEOM_TYPE.enum, GEOM_TYPE_DISPLAY))[self.geometry_type],
            ),
        )

    # IFeatureLayer

    @property
    def feature_query(self):
        class BoundFeatureQuery(FeatureQueryBase):
            layer = self
            # TODO: support from spatial_ref_sys table
            srs_supported = (self.srs_id,)

        return BoundFeatureQuery

    @property
    def filter_parser(self):
        return FilterParser.from_resource(self)

    def field_by_keyname(self, keyname):
        for f in self.fields:
            if f.keyname == keyname:
                return f

        raise KeyError("Field '%s' not found!" % keyname)

    # IWritableFeatureLayer

    def _sa_table(self, init_columns=False):
        cols = []
        if init_columns:
            cols.extend([sa.sql.column(f.column_name) for f in self.fields])
            cols.append(sa.sql.column(self.column_id))
            cols.append(sa.sql.column(self.column_geom))

        tab = sa.sql.table(self.table, *cols)
        tab.schema = self.schema
        tab.quote = True
        tab.quote_schema = True

        return tab

    def _makevals(self, feature):
        values = dict()

        for f in self.fields:
            if f.keyname in feature.fields.keys():
                values[f.column_name] = feature.fields[f.keyname]

        if (geom := feature.geom) is not UNSET:
            if geom is None:
                values[self.column_geom] = None
            else:
                values[self.column_geom] = geom_wkb_lr.bindparams(
                    bindparam("wkb", geom.wkb, unique=True),
                    bindparam("lsrs", self.srs_id, unique=True),
                    bindparam("rsrs", self.geometry_srid, unique=True),
                )

        return values

    def feature_put(self, feature):
        """Update existing object

        :param feature: object description
        :type feature:  Feature
        """
        idcol = sa.sql.column(self.column_id)
        tab = self._sa_table(True)
        stmt = sa.update(tab).values(self._makevals(feature)).where(idcol == feature.id)

        with self.connection.get_connection() as conn:
            conn.execute(stmt)

    def feature_create(self, feature):
        """Insert new object to DB which is described in feature

        :param feature: object description
        :type feature:  Feature

        :return:    inserted object ID
        """
        idcol = sa.sql.column(self.column_id)
        tab = self._sa_table(True)
        stmt = sa.insert(tab).values(self._makevals(feature)).returning(idcol)

        with self.connection.get_connection() as conn:
            return conn.execute(stmt).scalar()

    def feature_delete(self, feature_id):
        """Remove record with id

        :param feature_id: record id
        :type feature_id:  int or bigint
        """
        idcol = sa.sql.column(self.column_id)
        tab = self._sa_table()
        stmt = sa.delete(tab).where(idcol == feature_id)

        with self.connection.get_connection() as conn:
            conn.execute(stmt)

    def feature_delete_all(self):
        """Remove all records from a layer"""
        tab = self._sa_table()
        stmt = sa.delete(tab)

        with self.connection.get_connection() as conn:
            conn.execute(stmt)

    # IBboxLayer
    @property
    def extent(self):
        return calculate_extent(self)


DataScope.read.require(ConnectionScope.connect, attr="connection", cls=PostgisLayer)


class GeometryTypeAttr(SAttribute):
    ctypes = CRUTypes(
        FeaureLayerGeometryType | None,
        FeaureLayerGeometryType,
        FeaureLayerGeometryType | None,
    )


class GeometrySridAttr(SAttribute):
    ctypes = CRUTypes(int | None, int, int | None)


class FieldsAttr(SAttribute):
    def set(
        self,
        srlzr: Serializer,
        value: Literal["update", "keep"],
        *,
        create: bool,
    ):
        if value == "update":
            if srlzr.obj.connection.has_permission(ConnectionScope.connect, srlzr.user):
                srlzr.obj.setup()
            else:
                raise ForbiddenError()


class PostgisLayerSerializer(Serializer, resource=PostgisLayer):
    connection = SResource(read=ResourceScope.read, write=ResourceScope.update)
    schema = SColumn(read=ResourceScope.read, write=ResourceScope.update)
    table = SColumn(read=ResourceScope.read, write=ResourceScope.update)
    column_id = SColumn(read=ResourceScope.read, write=ResourceScope.update)
    column_geom = SColumn(read=ResourceScope.read, write=ResourceScope.update)
    geometry_type = GeometryTypeAttr(read=ResourceScope.read, write=ResourceScope.update)
    geometry_srid = GeometrySridAttr(read=ResourceScope.read, write=ResourceScope.update)
    srs = SRelationship(read=ResourceScope.read, write=ResourceScope.update)

    fields = FieldsAttr(read=None, write=ResourceScope.update)


@implementer(
    IFeatureQuery,
    IFeatureQueryFilter,
    IFeatureQueryFilterBy,
    IFeatureQueryLike,
    IFeatureQueryIlike,
    IFeatureQueryIntersects,
    IFeatureQueryOrderBy,
)
class FeatureQueryBase(FeatureQueryIntersectsMixin):
    def __init__(self):
        super().__init__()

        self._srs = None
        self._geom = None
        self._geom_format = "WKB"
        self._box = None

        self._fields = None
        self._limit = None
        self._offset = None

        self._filter = None
        self._filter_by = None
        self._like = None
        self._ilike = None
        self._filter_program = None

        self._order_by = None

    def srs(self, srs):
        self._srs = srs

    def geom(self):
        self._geom = True

    def geom_format(self, geom_format):
        self._geom_format = geom_format

    def box(self):
        self._box = True

    def fields(self, *args):
        self._fields = args

    def limit(self, limit, offset=0):
        self._limit = limit
        self._offset = offset

    def filter(self, *args):
        self._filter = args

    def filter_by(self, **kwargs):
        self._filter_by = kwargs

    def set_filter_program(self, program):
        self._filter_program = program

    def order_by(self, *args):
        self._order_by = args

    def like(self, value):
        self._like = value

    def ilike(self, value):
        self._ilike = value

    def __call__(self):
        tab = alias(self.layer._sa_table(True), name="tab")

        idcol = tab.columns[self.layer.column_id]
        columns = [idcol.label("id")]
        where = [idcol.isnot(None)]

        geomcol = tab.columns[self.layer.column_geom]

        columns_mapping = {"id": idcol}
        for field in self.layer.fields:
            columns_mapping[field.keyname] = getattr(tab.columns, field.column_name)

        srs = self.layer.srs if self._srs is None else self._srs

        if srs.id != self.layer.geometry_srid:
            geomexpr = st_transform(geomcol, srs.id)
        else:
            geomexpr = geomcol

        if self._geom:
            if self._geom_format == "WKB":
                geomexpr = func.st_asbinary(geomexpr, "NDR")
            else:
                geomexpr = func.st_astext(geomexpr)

            columns.append(geomexpr.label("geom"))

        selected_fields = []
        for idx, fld in enumerate(self.layer.fields):
            if self._fields is None or fld.keyname in self._fields:
                label = f"fld_{idx}"
                columns.append(getattr(tab.columns, fld.column_name).label(label))
                selected_fields.append((fld.keyname, label))

        if self._filter_by:
            for k, v in self._filter_by.items():
                if k == "id":
                    where.append(idcol == v)
                else:
                    field = self.layer.field_by_keyname(k)
                    where.append(tab.columns[field.column_name] == v)

        if self._filter:
            _where_filter = []
            for k, o, v in self._filter:
                supported_operators = (
                    "eq",
                    "ne",
                    "isnull",
                    "ge",
                    "gt",
                    "le",
                    "lt",
                    "like",
                    "ilike",
                )
                if o not in supported_operators:
                    raise ValueError(
                        "Invalid operator '%s'. Only %r are supported." % (o, supported_operators)
                    )

                if o == "like":
                    o = "like_op"
                elif o == "ilike":
                    o = "ilike_op"
                elif o == "isnull":
                    if v == "yes":
                        o = "is_"
                    elif v == "no":
                        o = "isnot"
                    else:
                        raise ValueError("Invalid value '%s' for operator '%s'." % (v, o))
                    v = sa.sql.null()

                op = getattr(sa.sql.operators, o)
                if k == "id":
                    column = idcol
                else:
                    field = self.layer.field_by_keyname(k)
                    column = tab.columns[field.column_name]

                _where_filter.append(op(column, v))

            if len(_where_filter) > 0:
                where.append(sa.and_(*_where_filter))

        if self._filter_program is not None:
            clause = self._filter_program.to_clause(columns_mapping)
            if clause is not None:
                where.append(clause)

        if self._like or self._ilike:
            operands = [
                cast(tab.columns[fld.column_name], sa.Unicode)
                for fld in self.layer.fields
                if fld.text_search
            ]
            if len(operands) == 0:
                where.append(False)
            else:
                method, value = ("like", self._like) if self._like else ("ilike", self._ilike)
                where.append(sa.or_(*(getattr(op, method)(f"%{value}%") for op in operands)))

        if self._intersects:
            int_srid = self._intersects.srid
            if int_srid is None:
                int_srid = self.layer.srs_id

            reproject = int_srid != self.layer.geometry_srid
            int_srs = SRS.filter_by(id=int_srid).one() if reproject else self.layer.srs

            int_geom = func.st_geomfromtext(self._intersects.wkt)
            if int_srs.is_geographic:
                # Prevent tolerance condition error
                bound_geom = func.st_makeenvelope(-180, -89.9, 180, 89.9)
                int_geom = func.st_intersection(bound_geom, int_geom)
            int_geom = st_setsrid(int_geom, int_srs.id)
            if reproject:
                int_geom = st_transform(int_geom, self.layer.geometry_srid)

            where.append(func.st_intersects(geomcol, int_geom))

        if self._box:
            columns.extend(
                (
                    st_xmin(geomexpr).label("box_left"),
                    st_ymin(geomexpr).label("box_bottom"),
                    st_xmax(geomexpr).label("box_right"),
                    st_ymax(geomexpr).label("box_top"),
                )
            )

        gt = self.layer.geometry_type
        if gt in GEOM_TYPE.has_z:
            gt = re.sub(r"Z$", "", gt)
            ndims = 3
        else:
            ndims = 2

        where.append(
            sql_or(
                geomcol.is_(None),
                sql_and(
                    func.geometrytype(geomcol) == text(f"'{gt}'"),
                    func.st_ndims(geomcol) == text(str(ndims)),
                ),
            )
        )

        order_criterion = []
        if self._order_by:
            for order, k in self._order_by:
                field = self.layer.field_by_keyname(k)
                order_criterion.append(
                    dict(asc=sa.asc, desc=sa.desc)[order](tab.columns[field.column_name])
                )
        order_criterion.append(idcol)

        class QueryFeatureSet(FeatureSet):
            layer = self.layer

            _geom = self._geom
            _geom_format = self._geom_format
            _box = self._box
            _fields = self._fields
            _limit = self._limit
            _offset = self._offset

            def __iter__(self):
                query = (
                    sql.select(*columns)
                    .limit(self._limit)
                    .offset(self._offset)
                    .order_by(*order_criterion)
                )

                if len(where) > 0:
                    query = query.where(sa.and_(*where))

                with self.layer.connection.get_connection() as conn:
                    result = conn.execute(query)
                    for row in result.mappings():
                        fdict = dict((keyname, row[label]) for keyname, label in selected_fields)

                        if self._geom:
                            if (geom_data := row.geom) is None:
                                geom = None
                            elif self._geom_format == "WKB":
                                geom = Geometry.from_wkb(geom_data.tobytes(), validate=False)
                            elif self._geom_format == "WKT":
                                geom = Geometry.from_wkt(geom_data, validate=False)
                            else:
                                raise NotImplementedError
                        else:
                            geom = UNSET

                        if self._box and row.box_left is not None:
                            _box = box(row.box_left, row.box_bottom, row.box_right, row.box_top)
                        else:
                            _box = None

                        yield Feature(
                            layer=self.layer,
                            id=row.id,
                            fields=fdict,
                            geom=geom,
                            box=_box,
                        )

            @property
            def total_count(self):
                with self.layer.connection.get_connection() as conn:
                    query = sql.select(func.count(idcol))
                    if len(where) > 0:
                        query = query.where(sa.and_(*where))
                    result = conn.execute(query)
                    return result.scalar()

            @property
            def extent(self):
                return calculate_extent(self.layer, where, geomcol)

        return QueryFeatureSet()
