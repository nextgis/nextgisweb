# -*- coding: utf-8 -*-
import subprocess

import sqlalchemy as sa
import sqlalchemy.orm as orm

from osgeo import gdal, gdalconst, osr

from ..models import declarative_base
from ..resource import (
    Resource,
    MetaDataScope,
    DataScope,
    Serializer,
    SerializedProperty as SP,
    SerializedRelationship as SR)
from ..env import env
from ..layer import SpatialLayerMixin
from ..file_storage import FileObj

Base = declarative_base()


@Resource.registry.register
class RasterLayer(Base, DataScope, Resource, SpatialLayerMixin):
    identity = 'raster_layer'
    cls_display_name = u"Растровый слой"

    __tablename__ = identity
    __mapper_args__ = dict(polymorphic_identity=identity)

    resource_id = sa.Column(sa.ForeignKey(Resource.id), primary_key=True)

    fileobj_id = sa.Column(sa.ForeignKey(FileObj.id), nullable=True)

    xsize = sa.Column(sa.Integer, nullable=False)
    ysize = sa.Column(sa.Integer, nullable=False)
    band_count = sa.Column(sa.Integer, nullable=False)

    fileobj = orm.relationship(FileObj, cascade='all')

    @classmethod
    def check_parent(self, parent):
        return parent.cls == 'resource_group'

    def load_file(self, filename, env):
        ds = gdal.Open(filename, gdalconst.GA_ReadOnly)

        src_osr = osr.SpatialReference()
        src_osr.ImportFromWkt(ds.GetProjection())
        dst_osr = osr.SpatialReference()
        src_osr.ImportFromEPSG(int(self.srs.id))

        reproject = not src_osr.IsSame(dst_osr)

        fobj = FileObj(component='raster_layer')

        dst_file = env.file_storage.filename(fobj, makedirs=True)
        self.fileobj = fobj

        if reproject:
            cmd = ['gdalwarp', '-of', 'GTiff',
                   '-t_srs', 'EPSG:%d' % self.srs.id]
            if ds.RasterCount == 3:
                cmd.append('-dstalpha')
        else:
            cmd = ['gdal_translate', '-of', 'GTiff']

        cmd.extend(('-co', 'TILED=YES', filename, dst_file))

        subprocess.check_call(cmd)

        ds = gdal.Open(dst_file, gdalconst.GA_ReadOnly)

        self.xsize = ds.RasterXSize
        self.ysize = ds.RasterYSize
        self.band_count = ds.RasterCount

    def gdal_dataset(self):
        fn = env.file_storage.filename(self.fileobj)
        return gdal.Open(fn, gdalconst.GA_ReadOnly)

    def get_info(self):
        s = super(RasterLayer, self)
        return (s.get_info() if hasattr(s, 'get_info') else ()) + (
            (u"Идентификатор файла", self.fileobj.uuid),
        )


class _source_attr(SP):

    def setter(self, srlzr, value):
        filedata, filemeta = env.file_upload.get_filename(value['id'])
        srlzr.obj.load_file(filedata, env)


class RasterLayerSerializer(Serializer):
    identity = RasterLayer.identity
    resclass = RasterLayer

    srs = SR(read='view', write='edit', scope=DataScope)

    xsize = SP(read='view', write=None, scope=MetaDataScope)
    ysize = SP(read='view', write=None, scope=MetaDataScope)
    band_count = SP(read='view', write=None, scope=MetaDataScope)

    source = _source_attr(read=None, write='edit', scope=DataScope)
