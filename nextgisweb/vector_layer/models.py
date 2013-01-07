# -*- coding: utf-8 -*-
from osgeo import ogr, osr
import uuid

from zope.interface import implements

import sqlalchemy as sa
import geoalchemy as ga
import sqlalchemy.orm as orm
import sqlalchemy.sql as sql

from ..geometry import geom_from_wkb
from ..models.base import Base, DBSession
from ..layer import Layer, SpatialLayerMixin

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

GEOM_TYPE_GA = (ga.MultiPoint, ga.MultiLineString, ga.MultiPolygon)
GEOM_TYPE_DB = ('MULTIPOINT', 'MULTILINESTRING', 'MULTIPOLYGON')
GEOM_TYPE_OGR = (ogr.wkbPoint, ogr.wkbLineString, ogr.wkbPolygon)
GEOM_TYPE_DISPLAY = (u"Точка", u"Линия", u"Полигон")
FIELD_TYPE_DB = (sa.Integer, sa.Float, sa.Unicode, sa.Date, sa.Time, sa.DateTime)
FIELD_TYPE_OGR = (ogr.OFTInteger, ogr.OFTReal, ogr.OFTString, ogr.OFTDate, ogr.OFTTime, ogr.OFTDateTime)

_GEOM_OGR_2_TYPE = dict(zip(GEOM_TYPE_OGR, GEOM_TYPE.enum))
_GEOM_TYPE_2_DB = dict(zip(GEOM_TYPE.enum, GEOM_TYPE_DB))
_GEOM_TYPE_2_GA = dict(zip(GEOM_TYPE_DB, GEOM_TYPE_GA))

_FIELD_TYPE_2_ENUM = dict(zip(FIELD_TYPE_OGR, FIELD_TYPE.enum))
_FIELD_TYPE_2_DB = dict(zip(FIELD_TYPE.enum, FIELD_TYPE_DB))


class FieldDef(object):

    def __init__(self, key, keyname, datatype):
        self.key = key
        self.keyname = keyname
        self.datatype = datatype


class TableInfo(object):

    def __init__(self, srs_id):
        self.srs_id = srs_id
        self.metadata = None
        self.table = None
        self.model = None

    @classmethod
    def from_ogrlayer(cls, ogrlayer, srs_id):
        self = cls(srs_id)

        self.geometry_type = _GEOM_OGR_2_TYPE[ogrlayer.GetGeomType()]
        self.fields = []

        defn = ogrlayer.GetLayerDefn()
        for i in range(defn.GetFieldCount()):
            fld_defn = defn.GetFieldDefn(i)
            self.fields.append(FieldDef(
                'fld_%02x' % i,
                fld_defn.GetNameRef(),
                _FIELD_TYPE_2_ENUM[fld_defn.GetType()]
            ))

        return self

    @classmethod
    def from_layer(cls, layer):
        self = cls(layer.srs_id)

        self.geometry_type = layer.geometry_type

        self.fields = []
        for f in layer.fields:
            self.fields.append(FieldDef(
                'fld_%02x' % f.idx,
                f.keyname,
                f.datatype,
            ))

        return self

    def __getitem__(self, keyname):
        for f in self.fields:
            if f.keyname == keyname:
                return f

    def setup_layer(self, layer):
        layer.geometry_type = self.geometry_type

        layer.fields = []
        for f in self.fields:
            layer.fields.append(LayerField(
                keyname=f.keyname,
                datatype=f.datatype
            ))

    def setup_metadata(self, tablename=None):
        metadata = sa.MetaData(schema='vector_layer' if tablename else None)
        geom_fldtype = _GEOM_TYPE_2_DB[self.geometry_type]

        class model(object):
            def __init__(self, **kwargs):
                for k, v in kwargs.iteritems():
                    setattr(self, k, v)

        table = sa.Table(
            tablename if tablename else ('lvd_' + str(uuid4().hex)), metadata,
            sa.Column('id', sa.Integer, primary_key=True),
            ga.GeometryExtensionColumn('geom', _GEOM_TYPE_2_GA[geom_fldtype](2, srid=self.srs_id)),
            *map(lambda (fld): sa.Column(fld.key, _FIELD_TYPE_2_DB[fld.datatype]), self.fields)
        )

        ga.GeometryDDL(table)

        orm.mapper(model, table)

        self.metadata = metadata
        self.table = table
        self.model = model

    def load_from_ogr(self, ogrlayer):
        source_osr = ogrlayer.GetSpatialRef()
        target_osr = osr.SpatialReference()
        target_osr.ImportFromEPSG(self.srs_id)

        transform = osr.CoordinateTransformation(source_osr, target_osr)

        feature = ogrlayer.GetNextFeature()
        fid = 0
        while feature:
            fid += 1
            geom = feature.GetGeometryRef()

            if geom.GetGeometryType() == ogr.wkbPoint:
                geom = ogr.ForceToMultiPoint(geom)
            elif geom.GetGeometryType() == ogr.wkbLineString:
                geom = ogr.ForceToMultiLineString(geom)
            elif geom.GetGeometryType() == ogr.wkbPolygon:
                geom = ogr.ForceToMultiPolygon(geom)

            geom.Transform(transform)

            fld_values = dict()
            for i in range(feature.GetFieldCount()):
                fld_type = feature.GetFieldDefnRef(i).GetType()
                fld_value = None
                if fld_type == ogr.OFTInteger:
                    fld_value = feature.GetFieldAsInteger(i)
                elif fld_type == ogr.OFTReal:
                    fld_value = feature.GetFieldAsDouble(i)
                elif fld_type == ogr.OFTString:
                    fld_value = feature.GetFieldAsString(i)
                fld_values[self[feature.GetFieldDefnRef(i).GetNameRef()].key] = fld_value

            obj = self.model(fid=fid, geom=ga.WKTSpatialElement(str(geom), self.srs_id), **fld_values)
            DBSession.add(obj)

            feature = ogrlayer.GetNextFeature()


@Layer.registry.register
class VectorLayer(Layer, SpatialLayerMixin, LayerFieldsMixin):
    implements(IFeatureLayer)

    __tablename__ = 'vector_layer'

    identity = __tablename__
    cls_display_name = u"Векторный слой"

    layer_id = sa.Column(sa.Integer, sa.ForeignKey(Layer.id), primary_key=True)
    geometry_type = sa.Column(sa.Enum(*GEOM_TYPE.enum, native_enum=False), nullable=False)

    __mapper_args__ = dict(
        polymorphic_identity=identity,
    )

    @property
    def _tablename(self):
        return 'layer_%08x' % self.id

    def setup_from_ogr(self, ogrlayer):
        tableinfo = TableInfo.from_ogrlayer(ogrlayer, self.srs_id)
        tableinfo.setup_layer(self)

        DBSession.flush()
        tableinfo.setup_metadata(tablename=self._tablename)
        tableinfo.metadata.create_all(bind=DBSession.connection())

        self.tableinfo = tableinfo

    def load_from_ogr(self, ogrlayer):
        self.tableinfo.load_from_ogr(ogrlayer)

    def get_info(self):
        return super(VectorLayer, self).get_info() + (
            (u"Тип геометрии", dict(zip(GEOM_TYPE.enum, GEOM_TYPE_DISPLAY))[self.geometry_type]),
        )

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


def __create_schema(event, schema_item, bind):
    bind.execute("""
        DROP SCHEMA IF EXISTS vector_layer CASCADE; CREATE SCHEMA vector_layer;
    """)

VectorLayer.__table__.append_ddl_listener('after-create', __create_schema)


class FeatureQueryBase(object):
    implements(IFeatureQuery, IFeatureQueryFilterBy)
    
    def __init__(self):
        self._filter_by = None
        self._fields = None
        self._intersects = None

    def fields(self, *args):
        self._fields = args

    def filter_by(self, **kwargs):
        self._filter_by = kwargs

    def order_by(self, *args):
        self._order_by = args

    def intersects(self, geom):
        self._intersects = geom

    def __call__(self):
        tableinfo = TableInfo.from_layer(self.layer)
        tableinfo.setup_metadata(tablename=self.layer._tablename)
        table = tableinfo.table

        columns = [table.columns.id, table.columns.geom.label('geom'), ]
        select_args = [columns, ]

        selected_fields = []
        for f in tableinfo.fields:
            if not self._fields or f.keyname in self._fields:
                columns.append(table.columns[f.key].label(f.keyname))
                selected_fields.append(f)

        if self._filter_by:
            for k, v in self._filter_by.iteritems():
                if k == 'id':
                    select_args.append(table.columns.id == v)
                else:
                    select_args.append(table.columns[tableinfo[k].key] == v)

        if self._intersects:
            geom = ga.WKTSpatialElement(self._intersects.wkt, self._intersects.srid)
            select_args.append(geom.intersects(table.columns.geom))

        class QueryFeatureSet(FeatureSet):
            fields = selected_fields

            def __iter__(self):
                query = sql.select(*select_args)
                res = DBSession.connection().execute(query)
                for row in res:
                    fdict = dict([(f.keyname, row[f.keyname]) for f in selected_fields])
                    yield Feature(id=row.id, fields=fdict, geom=geom_from_wkb(str(row.geom.geom_wkb)))

        return QueryFeatureSet()