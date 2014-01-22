# -*- coding: utf-8 -*-
from zope.interface import implements

import sqlalchemy as sa
from psycopg2.extensions import adapt

from ..geometry import geom_from_wkt, box
from ..layer import SpatialLayerMixin
from ..feature_layer import (
    Feature,
    FeatureSet,
    LayerField,
    LayerFieldsMixin,
    GEOM_TYPE,
    FIELD_TYPE,
    IFeatureLayer,
    IFeatureQuery,
    IFeatureQueryFilterBy,
)


GEOM_TYPE_DISPLAY = (u"Точка", u"Линия", u"Полигон")


def initialize(comp):

    Layer = comp.env.layer.Layer

    @Layer.registry.register
    class PostgisLayer(Layer, SpatialLayerMixin, LayerFieldsMixin):
        implements(IFeatureLayer)

        __tablename__ = 'postgis_layer'

        identity = __tablename__
        cls_display_name = u"Cлой PostGIS"

        layer_id = sa.Column(sa.Integer, sa.ForeignKey(Layer.id), primary_key=True)
        connection = sa.Column(sa.Unicode, nullable=False)
        schema = sa.Column(sa.Unicode, default=u'public', nullable=False)
        table = sa.Column(sa.Unicode, nullable=False)
        column_id = sa.Column(sa.Unicode, nullable=False)
        column_geom = sa.Column(sa.Unicode, nullable=False)
        geometry_type = sa.Column(sa.Enum(*GEOM_TYPE.enum, native_enum=False), nullable=False)
        geometry_srid = sa.Column(sa.Integer, nullable=False)

        __mapper_args__ = dict(
            polymorphic_identity=identity,
        )

        def get_info(self):
            return super(PostgisLayer, self).get_info() + (
                (u"Тип геометрии", dict(zip(GEOM_TYPE.enum, GEOM_TYPE_DISPLAY))[self.geometry_type]),
                (u"Подключение", self.connection),
                (u"Схема", self.schema),
                (u"Таблица", self.table),
                (u"Поле ID", self.column_id),
                (u"Поле геометрии", self.column_geom),
            )

        def setup(self):
            conn = comp.connection[self.connection].connect()
            try:
                result = conn.execute(
                    """SELECT type, srid FROM geometry_columns
                    WHERE f_table_schema = %s
                        AND f_table_name = %s
                        AND f_geometry_column = %s""",
                    self.schema,
                    self.table,
                    self.column_geom
                )

                row = result.first()
                if row:
                    self.geometry_srid = row['srid']
                    self.geometry_type = row['type'].replace('MULTI', '')

                result = conn.execute(
                    """SELECT column_name, data_type
                    FROM information_schema.columns
                    WHERE table_schema = %s
                        AND table_name = %s
                    ORDER BY ordinal_position""",
                    self.schema,
                    self.table
                )
                for row in result:
                    if row['column_name'] in (self.column_id, self.column_geom):
                        pass
                    elif row['column_name'] in ('id', 'geom'):
                        pass
                    else:
                        datatype = None
                        if row['data_type'] == 'integer':
                            datatype = FIELD_TYPE.INTEGER
                        elif row['data_type'] == 'double precision':
                            datatype = FIELD_TYPE.REAL
                        elif row['data_type'] == 'character varying':
                            datatype = FIELD_TYPE.STRING

                        if datatype is not None:
                            self.fields.append(LayerField(
                                keyname=row['column_name'],
                                display_name=row['column_name'],
                                datatype=datatype))
            finally:
                conn.close()

        # IFeatureLayer

        @property
        def feature_query(self):

            class BoundFeatureQuery(FeatureQueryBase):
                layer = self

            return BoundFeatureQuery

        def field_by_keyname(self, keyname):
            for f in self.fields:
                if f.keyname == keyname:
                    return f

            raise KeyError("Field '%s' not found!" % keyname)

    comp.PostgisLayer = PostgisLayer

    class FeatureQueryBase(object):
        implements(IFeatureQuery, IFeatureQueryFilterBy)

        def __init__(self):
            self._geom = None
            self._box = None

            self._fields = None
            self._limit = None
            self._offset = None

            self._filter_by = None
            self._intersects = None

        def geom(self):
            self._geom = True

        def box(self):
            self._box = True

        def fields(self, *args):
            self._fields = args

        def limit(self, limit, offset=0):
            self._limit = limit
            self._offset = offset

        def filter_by(self, **kwargs):
            self._filter_by = kwargs

        def order_by(self, *args):
            self._order_by = args

        def intersects(self, geom):
            self._intersects = geom

        def __call__(self):
            columns = dict(id=self.layer.column_id)

            geomexpr = 'ST_Transform(%s, %s)' % (
                    self.layer.column_geom, self.layer.srs_id)

            if self._geom:
                columns['geom'] = "ST_AsText(%s)" % geomexpr

            cond = []

            if self._filter_by:
                for k, v in self._filter_by.iteritems():
                    if k == 'id':
                        cond.append('"%s" = %d' % (self.layer.column_id, int(v)))
                    else:
                        cond.append('"%s" = %s' % (k, adapt(v)))

            if len(cond) == 0:
                cond.append('true')

            if self._box:
                columns['box_left'] = "ST_XMin(%s)" % geomexpr
                columns['box_bottom'] = "ST_YMin(%s)" % geomexpr
                columns['box_right'] = "ST_XMax(%s)" % geomexpr
                columns['box_top'] = "ST_YMax(%s)" % geomexpr

            selected_fields = []
            for fld in self.layer.fields:
                if not self._fields or fld.keyname in self._fields:
                    columns[fld.keyname] = '"%s"' % fld.keyname
                    selected_fields.append(fld)

            if self._intersects:
                cond.append('ST_Intersects("%s", ST_Transform(ST_SetSRID(ST_GeomFromText(\'%s\'), %d), %s))' % (
                    self.layer.column_geom,
                    self._intersects.wkt,
                    self._intersects.srid,
                    self.layer.geometry_srid))

            class QueryFeatureSet(FeatureSet):
                layer = self.layer

                _geom = self._geom
                _box = self._box
                _fields = self._fields
                _limit = self._limit
                _offset = self._offset

                def __iter__(self):
                    cols = []
                    for k, v in columns.iteritems():
                        cols.append('%s AS "%s"' % (v, k))

                    sql = """SELECT %(cols)s FROM "%(schema)s"."%(table)s" WHERE %(cond)s""" % dict(
                        cols=", ".join(cols),
                        schema=self.layer.schema,
                        table=self.layer.table,
                        cond=' AND '.join(cond)
                    )

                    if self._limit:
                        sql = sql + " LIMIT %d OFFSET %d" % (self._limit, self._offset)

                    conn = comp.connection[self.layer.connection].connect()
                    result = conn.execute(sql)

                    for row in result:
                        fdict = dict([(f.keyname, row[f.keyname]) for f in selected_fields])

                        yield Feature(
                            layer=self.layer,
                            id=row['id'],
                            fields=fdict,
                            geom=geom_from_wkt(row['geom']) if self._geom else None,
                            box=box(
                                row['box_left'], row['box_bottom'],
                                row['box_right'], row['box_top']
                            ) if self._box else None
                        )

                    conn.close()

                @property
                def total_count(self):
                    sql = """SELECT COUNT("%(column_id)s") FROM "%(schema)s"."%(table)s" WHERE %(cond)s""" % dict(
                        column_id=self.layer.column_id,
                        schema=self.layer.schema,
                        table=self.layer.table,
                        cond=' AND '.join(cond)
                    )

                    conn = comp.connection[self.layer.connection].connect()

                    try:
                        result = conn.execute(sql)
                        for row in result:
                            return row[0]
                    finally:
                        conn.close()

            return QueryFeatureSet()
