# -*- coding: utf-8 -*-
import subprocess

import sqlalchemy as sa
import sqlalchemy.orm as orm
import geoalchemy as ga

from osgeo import gdal, gdalconst, osr

from ..layer import SpatialLayerMixin
from ..spatial_ref_sys import SRS
from ..file_storage import FileObj
from ..models import DBSession


def include(comp):
    Layer = comp.env.layer.Layer
    file_storage = comp.env.file_storage

    @Layer.registry.register
    class RasterLayer(Layer, SpatialLayerMixin):
        __tablename__ = 'raster_layer'

        identity = __tablename__
        cls_display_name = u"Растровый слой"

        layer_id = sa.Column(sa.Integer, sa.ForeignKey(Layer.id), primary_key=True)
        fileobj_id = sa.Column(sa.Integer, sa.ForeignKey(FileObj.id), nullable=True)

        xsize = sa.Column(sa.Integer, nullable=False)
        ysize = sa.Column(sa.Integer, nullable=False)
        band_count = sa.Column(sa.Integer, nullable=False)

        fileobj = orm.relationship(FileObj, cascade='all')

        __mapper_args__ = dict(
            polymorphic_identity=identity,
        )

        def load_file(self, filename, env):
            ds = gdal.Open(filename, gdalconst.GA_ReadOnly)

            src_osr = osr.SpatialReference()
            src_osr.ImportFromWkt(ds.GetProjection())
            dst_osr = osr.SpatialReference()
            src_osr.ImportFromEPSG(int(self.srs_id))

            reproject = not src_osr.IsSame(dst_osr)

            fobj = FileObj(component='raster_layer')

            dst_file = env.file_storage.filename(fobj, makedirs=True)
            self.fileobj = fobj

            if reproject:
                cmd = ['gdalwarp', '-of', 'GTiff', '-t_srs', 'EPSG:%d' % self.srs_id]
            else:
                cmd = ['gdal_translate', '-of', 'GTiff']

            cmd.extend(('-co', 'TILED=YES', filename, dst_file))

            subprocess.check_call(cmd)

            ds = gdal.Open(dst_file, gdalconst.GA_ReadOnly)

            self.xsize = ds.RasterXSize
            self.ysize = ds.RasterYSize
            self.band_count = ds.RasterCount

        def gdal_dataset(self):
            fn = file_storage.filename(self.fileobj)
            return gdal.Open(fn, gdalconst.GA_ReadOnly)

    comp.RasterLayer = RasterLayer
