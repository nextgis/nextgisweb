from functools import lru_cache

import geoalchemy2 as ga
from shapely.geometry import box
from sqlalchemy import cast, func, sql
from sqlalchemy.ext.compiler import compiles
from sqlalchemy.sql import ColumnElement, null, text
from zope.interface import implementer

from nextgisweb.env import DBSession
from nextgisweb.lib import db
from nextgisweb.lib.geometry import Geometry

from nextgisweb.feature_layer import (
    Feature,
    FeatureQueryIntersectsMixin,
    FeatureSet,
    IFeatureQuery,
    IFeatureQueryClipByBox,
    IFeatureQueryFilter,
    IFeatureQueryFilterBy,
    IFeatureQueryIlike,
    IFeatureQueryIntersects,
    IFeatureQueryLike,
    IFeatureQueryOrderBy,
    IFeatureQuerySimplify,
)
from nextgisweb.spatial_ref_sys import SRS

from .table_info import TableInfo


@implementer(
    IFeatureQuery,
    IFeatureQueryFilter,
    IFeatureQueryFilterBy,
    IFeatureQueryLike,
    IFeatureQueryIlike,
    IFeatureQueryIntersects,
    IFeatureQueryOrderBy,
    IFeatureQueryClipByBox,
    IFeatureQuerySimplify,
)
class FeatureQueryBase(FeatureQueryIntersectsMixin):
    def __init__(self):
        super().__init__()

        self._srs = None
        self._geom = None
        self._single_part = None
        self._geom_format = "WKB"
        self._clip_by_box = None
        self._simplify = None
        self._box = None

        self._geom_len = None

        self._fields = None
        self._limit = None
        self._offset = None

        self._filter = None
        self._filter_by = None
        self._filter_sql = None
        self._like = None
        self._ilike = None

        self._order_by = None

    def srs(self, srs):
        self._srs = srs

    def geom(self, single_part=False):
        self._geom = True
        self._single_part = single_part

    def geom_format(self, geom_format):
        self._geom_format = geom_format

    def clip_by_box(self, box):
        self._clip_by_box = box

    def simplify(self, tolerance):
        self._simplify = tolerance

    def geom_length(self):
        self._geom_len = True

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

    def filter_sql(self, *args):
        if len(args) > 0 and isinstance(args[0], list):
            self._filter_sql = args[0]
        else:
            self._filter_sql = args

    def order_by(self, *args):
        self._order_by = args

    def like(self, value):
        self._like = value

    def ilike(self, value):
        self._ilike = value

    def __call__(self):
        tableinfo = TableInfo.from_layer(self.layer)
        tableinfo.setup_metadata(self.layer._tablename)
        table = tableinfo.table

        idcol = table.columns.id
        columns = [idcol]
        where = []

        geomcol = table.columns.geom

        srs = self.layer.srs if self._srs is None else self._srs

        if srs.id != self.layer.srs_id:
            geomexpr = func.st_transform(geomcol, srs.id)
        else:
            geomexpr = geomcol

        if self._clip_by_box is not None:
            if _clipbybox2d_exists():
                clip = func.st_setsrid(
                    func.st_makeenvelope(*self._clip_by_box.bounds), self._clip_by_box.srid
                )
                geomexpr = func.st_clipbybox2d(geomexpr, clip)
            else:
                clip = func.st_setsrid(
                    func.st_geomfromtext(self._clip_by_box.wkt), self._clip_by_box.srid
                )
                geomexpr = func.st_intersection(geomexpr, clip)

        if self._simplify is not None:
            geomexpr = func.st_simplifypreservetopology(geomexpr, self._simplify)

        if self._geom_len:
            columns.append(
                func.st_length(func.geography(func.st_transform(geomexpr, 4326))).label("geom_len")
            )

        if self._box:
            columns.extend(
                (
                    func.st_xmin(geomexpr).label("box_left"),
                    func.st_ymin(geomexpr).label("box_bottom"),
                    func.st_xmax(geomexpr).label("box_right"),
                    func.st_ymax(geomexpr).label("box_top"),
                )
            )

        if self._geom:
            if self._single_part:

                class geom(ColumnElement):
                    def __init__(self, base):
                        self.base = base

                @compiles(geom)
                def compile(expr, compiler, **kw):
                    return "(%s).geom" % str(compiler.process(expr.base))

                geomexpr = geom(func.st_dump(geomexpr))

            if self._geom_format == "WKB":
                geomexpr = func.st_asbinary(geomexpr, "NDR")
            else:
                geomexpr = func.st_astext(geomexpr)

            columns.append(geomexpr.label("geom"))

        selected_fields = []
        for idx, fld in enumerate(tableinfo.fields):
            if self._fields is None or fld.keyname in self._fields:
                label = f"fld_{idx}"
                columns.append(table.columns[fld.key].label(label))
                selected_fields.append((fld.keyname, label))

        if self._filter_by:
            for k, v in self._filter_by.items():
                if k == "id":
                    where.append(idcol == v)
                else:
                    field = tableinfo.find_field(keyname=k)
                    where.append(table.columns[field.key] == v)

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
                    "in",
                    "notin",
                    "startswith",
                )
                if o not in supported_operators:
                    raise ValueError(
                        "Invalid operator '%s'. Only %r are supported." % (o, supported_operators)
                    )

                if v and o in ["in", "notin"]:
                    v = v.split(",")

                if o in [
                    "ilike",
                    "in",
                    "like",
                    "notin",
                    "startswith",
                ]:
                    o += "_op"
                elif o == "isnull":
                    if v == "yes":
                        o = "is_"
                    elif v == "no":
                        o = "isnot"
                    else:
                        raise ValueError("Invalid value '%s' for operator '%s'." % (v, o))
                    v = null()

                op = getattr(db.sql.operators, o)
                if k == "id":
                    column = idcol
                else:
                    field = tableinfo.find_field(keyname=k)
                    column = table.columns[field.key]

                _where_filter.append(op(column, v))

            if len(_where_filter) > 0:
                where.append(db.and_(*_where_filter))

        if self._filter_sql:
            _where_filter_sql = []
            for _filter_sql_item in self._filter_sql:
                if len(_filter_sql_item) == 3:
                    table_column, op, val = _filter_sql_item
                    if table_column == "id":
                        _where_filter_sql.append(op(idcol, val))
                    else:
                        field = tableinfo.find_field(keyname=table_column)
                        _where_filter_sql.append(op(table.columns[field.key], val))
                elif len(_filter_sql_item) == 4:
                    table_column, op, val1, val2 = _filter_sql_item
                    field = tableinfo.find_field(keyname=table_column)
                    _where_filter_sql.append(op(table.columns[field.key], val1, val2))

            if len(_where_filter_sql) > 0:
                where.append(db.and_(_where_filter_sql))

        if self._like or self._ilike:
            operands = [cast(table.columns[f.key], db.Unicode) for f in tableinfo.fields]
            if len(operands) == 0:
                where.append(False)
            else:
                method, value = ("like", self._like) if self._like else ("ilike", self._ilike)
                where.append(db.or_(*(getattr(op, method)(f"%{value}%") for op in operands)))

        if self._intersects:
            reproject = (
                self._intersects.srid is not None and self._intersects.srid != self.layer.srs_id
            )
            int_srs = (
                SRS.filter_by(id=self._intersects.srid).one() if reproject else self.layer.srs
            )

            int_geom = func.st_geomfromtext(self._intersects.wkt)
            if int_srs.is_geographic:
                # Prevent tolerance condition error
                bound_geom = func.st_makeenvelope(-180, -89.9, 180, 89.9)
                int_geom = func.st_intersection(bound_geom, int_geom)
            int_geom = func.st_setsrid(int_geom, int_srs.id)
            if reproject:
                int_geom = func.st_transform(int_geom, self.layer.srs_id)

            where.append(func.st_intersects(geomcol, int_geom))

        order_criterion = []
        if self._order_by:
            for order, colname in self._order_by:
                field = tableinfo.find_field(keyname=colname)
                order_criterion.append(
                    dict(asc=db.asc, desc=db.desc)[order](table.columns[field.key])
                )
        order_criterion.append(db.asc(idcol))

        class QueryFeatureSet(FeatureSet):
            layer = self.layer

            _geom = self._geom
            _geom_format = self._geom_format
            _geom_len = self._geom_len
            _box = self._box
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
                    query = query.where(db.and_(*where))

                result = DBSession.connection().execute(query)
                for row in result.mappings():
                    fdict = dict((keyname, row[label]) for keyname, label in selected_fields)

                    if self._geom:
                        if self._geom_format == "WKB":
                            geom_data = row["geom"].tobytes()
                            geom = Geometry.from_wkb(geom_data, validate=False)
                        else:
                            geom = Geometry.from_wkt(row["geom"], validate=False)
                    else:
                        geom = None

                    calculated = dict()
                    if self._geom_len:
                        calculated["geom_len"] = row["geom_len"]

                    yield Feature(
                        layer=self.layer,
                        id=row.id,
                        fields=fdict,
                        geom=geom,
                        calculations=calculated,
                        box=box(row.box_left, row.box_bottom, row.box_right, row.box_top)
                        if self._box
                        else None,
                    )

            @property
            def total_count(self):
                query = sql.select(func.count(idcol))
                if len(where) > 0:
                    query = query.where(db.and_(*where))
                result = DBSession.connection().execute(query)
                return result.scalar()

            @property
            def extent(self):
                return calculate_extent(self.layer, where, geomcol)

        return QueryFeatureSet()


def calculate_extent(layer, where=None, geomcol=None):
    tableinfo = TableInfo.from_layer(layer)
    tableinfo.setup_metadata(layer._tablename)

    if not (where is None and geomcol is None) and len(where) > 0:
        bbox = (
            sql.select(
                func.st_extent(
                    func.st_transform(
                        func.st_setsrid(cast(func.st_force2d(geomcol), ga.Geometry), layer.srs_id),
                        4326,
                    )
                )
            )
            .where(db.and_(True, *where))
            .label("bbox")
        )
    else:
        bbox = func.st_extent(
            func.st_transform(
                func.st_setsrid(
                    cast(func.st_force2d(tableinfo.geom_column), ga.Geometry), layer.srs_id
                ),
                4326,
            )
        ).label("bbox")
    sq = DBSession.query(bbox).subquery()

    fields = (
        func.st_xmax(sq.c.bbox),
        func.st_xmin(sq.c.bbox),
        func.st_ymax(sq.c.bbox),
        func.st_ymin(sq.c.bbox),
    )
    maxLon, minLon, maxLat, minLat = DBSession.query(*fields).one()

    extent = dict(minLon=minLon, maxLon=maxLon, minLat=minLat, maxLat=maxLat)

    return extent


@lru_cache()
def _clipbybox2d_exists():
    return (
        DBSession.connection()
        .execute(text("SELECT 1 FROM pg_proc WHERE proname='st_clipbybox2d'"))
        .fetchone()
    )
