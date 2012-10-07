# -*- coding: utf-8 -*-
from osgeo import ogr

import sqlalchemy as sa
import sqlalchemy.orm as orm
import geoalchemy as ga

from ..models.base import (
    Base,
    DBSession,
)

from ..layer import Layer


GEOM_TYPE_POINT = 'Point'
GEOM_TYPE_LINESTRING = 'Linestring'
GEOM_TYPE_POLYGON = 'Polygon'
GEOM_TYPE_ENUM = (GEOM_TYPE_POINT, GEOM_TYPE_LINESTRING, GEOM_TYPE_POLYGON)
GEOM_TYPE_DB = (ga.MultiPoint, ga.MultiLineString, ga.MultiPolygon)
GEOM_TYPE_OGR = (ogr.wkbPoint, ogr.wkbLineString, ogr.wkbPolygon)
GEOM_TYPE_DISPLAY = (u"Точка", u"Линия", u"Полигон")

FIELD_TYPE_ENUM = ('Integer', 'Real', 'String', 'Date', 'Time', 'DateTime')
FIELD_TYPE_DB = (sa.Integer, sa.Float, sa.Unicode, sa.Date, sa.Time, sa.DateTime)
FIELD_TYPE_OGR = (ogr.OFTInteger, ogr.OFTReal, ogr.OFTString, ogr.OFTDate, ogr.OFTTime, ogr.OFTDateTime)


@Layer.registry.register
class VectorLayer(Layer):
    __tablename__ = 'vector_layer'

    identity = __tablename__
    cls_display_name = u"Векторный слой"

    layer_id = sa.Column(sa.Integer, sa.ForeignKey(Layer.id), primary_key=True)
    geom_type = sa.Column(sa.Enum(*GEOM_TYPE_ENUM, native_enum=False), nullable=False)
    feature_count = sa.Column(sa.Integer)
    extent = ga.GeometryColumn(ga.Polygon(2, -1))

    fields = orm.relationship('VectorLayerField', cascade='all')

    __mapper_args__ = dict(
        polymorphic_identity=identity,
    )

    def metadata_and_table(self):
        metadata = sa.MetaData(schema='vector_layer')
        geom_cls = dict(zip(GEOM_TYPE_ENUM, GEOM_TYPE_DB))[self.geom_type]

        columns = []
        for fld in self.fields:
            columns.append(sa.Column(
                'fld%d' % fld.idx,
                dict(zip(FIELD_TYPE_ENUM, FIELD_TYPE_DB))[fld.ftype]
            ))

        table = sa.Table(
            'id%04d' % self.id, metadata,
            sa.Column('fid', sa.Integer, primary_key=True),
            ga.GeometryExtensionColumn('geom', geom_cls(2, -1)),
            *columns
        )
        ga.GeometryDDL(table)
        return metadata, table

    def setup_from_ogr(self, ogrlayer):
        self.geom_type = dict(zip(GEOM_TYPE_OGR, GEOM_TYPE_ENUM))[ogrlayer.GetGeomType()]
        defn = ogrlayer.GetLayerDefn()
        for i in range(defn.GetFieldCount()):
            fld_defn = defn.GetFieldDefn(i)
            fobj = VectorLayerField(
                idx=i,
                name=fld_defn.GetNameRef(),
                ftype=dict(zip(FIELD_TYPE_OGR, FIELD_TYPE_ENUM))[fld_defn.GetType()]
            )
            self.fields.append(fobj)

    def load_from_ogr(self, ogrlayer):
        metadata, table = self.metadata_and_table()
        insert = table.insert()

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
                fld_values['fld%d' % i] = fld_value

            DBSession.connection().execute(insert, fid=fid, geom=str(geom), **fld_values)
            feature.Destroy()

            feature = ogrlayer.GetNextFeature()

        self.feature_count = fid
        self.update_extent()

    def update_extent(self):
        DBSession.execute("""
            UPDATE vector_layer SET extent = (SELECT geometry(ST_Extent(geom)) FROM vector_layer.id%04d)
            WHERE layer_id = %d
        """ % (self.id, self.id))

    def get_info(self):
        return Layer.get_info(self) + \
            (
                (u"Тип геометрии", dict(zip(GEOM_TYPE_ENUM, GEOM_TYPE_DISPLAY))[self.geom_type]),
                (u"Количество объектов", self.feature_count),
                (u"Экстент", DBSession.scalar(self.extent.wkt))
            )


ga.GeometryDDL(VectorLayer.__table__)


def __create_schema(event, schema_item, bind):
    bind.execute("""
        DROP SCHEMA IF EXISTS vector_layer CASCADE; CREATE SCHEMA vector_layer;
    """)


VectorLayer.__table__.append_ddl_listener('after-create', __create_schema)


class VectorLayerField(Base):
    __tablename__ = 'vector_layer_field'
    layer_id = sa.Column(sa.Integer, sa.ForeignKey(VectorLayer.id), primary_key=True)
    idx = sa.Column(sa.Integer, primary_key=True)
    name = sa.Column(sa.Unicode, nullable=False)
    ftype = sa.Column(sa.Enum(*FIELD_TYPE_ENUM, native_enum=False), nullable=False)
    comment = sa.Column(sa.Unicode, nullable=False, default=u'')
