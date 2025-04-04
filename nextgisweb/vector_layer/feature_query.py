import sqlalchemy as sa
from msgspec import UNSET
from shapely.geometry import box
from sqlalchemy import cast, func
from sqlalchemy.sql import alias, literal_column, null, select
from zope.interface import implementer

from nextgisweb.env import DBSession
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

        self._pit_version = None

        self._srs = None
        self._geom = None
        self._geom_format = "WKB"
        self._clip_by_box = None
        self._simplify = None
        self._box = None

        self._fields = None
        self._limit = None
        self._offset = None

        self._filter = None
        self._filter_by = None
        self._like = None
        self._ilike = None

        self._order_by = None

    @property
    def srs_supported(self):
        # TODO: The srs_supported attribute needs refactoring. This workaround
        # prevents querying all SRSs during BoundFeatureQuery creation.
        return tuple(row[0] for row in DBSession.query(SRS.id).all())

    def pit(self, version):
        self._pit_version = version

    def srs(self, srs):
        self._srs = srs

    def geom(self):
        self._geom = True

    def geom_format(self, geom_format):
        self._geom_format = geom_format

    def clip_by_box(self, box):
        self._clip_by_box = box

    def simplify(self, tolerance):
        self._simplify = tolerance

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

    def order_by(self, *args):
        self._order_by = args

    def like(self, value):
        self._like = value

    def ilike(self, value):
        self._ilike = value

    def __call__(self):
        vls = self.layer.vlschema()
        if not self._pit_version:
            table = alias(vls.ctab, "tab")
        else:
            table = vls.query_pit(self._pit_version)

        idcol = table.columns.fid
        geomcol = table.columns.geom
        fields = table.fields
        columns = []
        where = []

        srs = self.layer.srs if self._srs is None else self._srs
        if srs.id != self.layer.srs_id:
            geomexpr = func.st_transform(geomcol, srs.id)
        else:
            geomexpr = geomcol

        if self._clip_by_box is not None:
            clip = func.st_setsrid(
                func.st_makeenvelope(*self._clip_by_box.bounds),
                self._clip_by_box.srid,
            )

            # Wrap geomexpr in ST_Force2D to avoid invalid coordinates for
            # geometries with Z. The issue is fixed in modern GEOS and should
            # work out of the box without discarding the Z coordinate.
            geomexpr = func.st_clipbybox2d(func.st_force2d(geomexpr), clip)

        if self._simplify is not None:
            geomexpr = func.st_simplifypreservetopology(geomexpr, self._simplify)

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
            geomexpr = (
                func.st_asbinary(geomexpr, "NDR")
                if self._geom_format == "WKB"
                else func.st_astext(geomexpr)
            )
            columns.append(geomexpr.label("geom"))

        selected_fields = []
        for idx, (fld_k, fld_c) in enumerate(fields.items(), start=1):
            if self._fields is None or fld_k in self._fields:
                label = f"fld_{idx}"
                columns.append(fld_c.label(label))
                selected_fields.append((fld_k, label))

        if self._filter_by:
            for k, v in self._filter_by.items():
                where.append((idcol if k == "id" else fields[k]) == v)

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

                op = getattr(sa.sql.operators, o)
                column = idcol if k == "id" else fields[k]
                _where_filter.append(op(column, v))

            if len(_where_filter) > 0:
                where.append(sa.and_(*_where_filter))

        if self._like or self._ilike:
            operands = []
            text_seach_fields = set(f.keyname for f in self.layer.fields if f.text_search)
            for fld_k, fld_c in fields.items():
                if fld_k in text_seach_fields:
                    operands.append(cast(fld_c, sa.Unicode))
            if len(operands) == 0:
                where.append(False)
            else:
                method, value = ("like", self._like) if self._like else ("ilike", self._ilike)
                where.append(sa.or_(*(getattr(op, method)(f"%{value}%") for op in operands)))

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

        order_by = []
        if self._order_by:
            for order, fld_k in self._order_by:
                order_by.append(getattr(fields[fld_k], order)())
        order_by.append(idcol.asc())

        qbase = select(idcol)
        if (vid_col := table.c.get("vid")) is not None:
            qbase = qbase.add_columns(vid_col)
        elif self.layer.fversioning:
            vc = alias(vls.etab, "tab_e")
            qbase = qbase.add_columns(vc.c.vid)
            qbase = qbase.join(vc, vc.c.fid == idcol)
        else:
            qbase = qbase.add_columns(literal_column("NULL").label("vid"))
        qbase = qbase.add_columns(*columns)

        class QueryFeatureSet(FeatureSet):
            layer = self.layer

            _geom = self._geom
            _geom_format = self._geom_format
            _box = self._box
            _limit = self._limit
            _offset = self._offset

            def __iter__(self):
                query = qbase.where(*where).order_by(*order_by)
                query = query.limit(self._limit).offset(self._offset)

                result = DBSession.execute(query)
                for row in result.mappings():
                    fdict = {keyname: row[label] for keyname, label in selected_fields}

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
                        id=row.fid,
                        version=row.vid,
                        fields=fdict,
                        geom=geom,
                        box=_box,
                    )

            @property
            def total_count(self):
                query = select(func.count(idcol)).where(*where)
                return DBSession.scalar(query)

            @property
            def extent(self):
                geom_clause = select(geomcol).where(*where).subquery().c[0]
                return calculate_extent(geom_clause)

        return QueryFeatureSet()


def calculate_extent(geom_clause):
    bbox = func.st_extent(func.st_transform(geom_clause, sa.text("4326")))
    row = DBSession.query(
        func.st_xmin(bbox).label("minLon"),
        func.st_ymin(bbox).label("minLat"),
        func.st_xmax(bbox).label("maxLon"),
        func.st_ymax(bbox).label("maxLat"),
    ).one()
    return dict(row._mapping)
