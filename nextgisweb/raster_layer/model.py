# -*- coding: utf-8 -*-
from __future__ import unicode_literals, print_function, absolute_import
import subprocess
import os.path

import sqlalchemy as sa
import sqlalchemy.orm as orm

from zope.interface import implements

from osgeo import gdal, gdalconst, osr, ogr

from ..models import declarative_base
from ..resource import (
    Resource,
    DataStructureScope, DataScope,
    Serializer,
    SerializedProperty as SP,
    SerializedRelationship as SR,
    ResourceGroup)
from ..resource.exception import ValidationError
from ..env import env
from ..layer import SpatialLayerMixin, IBboxLayer
from ..file_storage import FileObj

from .util import _

PYRAMID_TARGET_SIZE = 512

Base = declarative_base()

SUPPORTED_DRIVERS = ('GTiff', )


class RasterLayer(Base, Resource, SpatialLayerMixin):
    identity = 'raster_layer'
    cls_display_name = _("Raster layer")

    __scope__ = (DataStructureScope, DataScope)

    implements(IBboxLayer)

    fileobj_id = sa.Column(sa.ForeignKey(FileObj.id), nullable=True)

    xsize = sa.Column(sa.Integer, nullable=False)
    ysize = sa.Column(sa.Integer, nullable=False)
    dtype = sa.Column(sa.Unicode, nullable=False)
    band_count = sa.Column(sa.Integer, nullable=False)

    fileobj = orm.relationship(FileObj, cascade='all')

    @classmethod
    def check_parent(cls, parent):
        return isinstance(parent, ResourceGroup)

    def load_file(self, filename, env):
        ds = gdal.Open(filename, gdalconst.GA_ReadOnly)
        if not ds:
            raise ValidationError(_("GDAL library was unable to open the file."))

        dsdriver = ds.GetDriver()
        dsproj = ds.GetProjection()
        dsgtran = ds.GetGeoTransform()

        if dsdriver.ShortName not in SUPPORTED_DRIVERS:
            raise ValidationError(
                _(
                    "Raster has format '%(format)s', however only following formats are supported: %(all_formats)s."
                )
                % dict(
                    format=dsdriver.ShortName,
                    all_formats=", ".join(SUPPORTED_DRIVERS),
                )
            )

        if not dsproj or not dsgtran:
            raise ValidationError(_("Raster files without projection info are not supported."))

        band_types = set(
            gdal.GetDataTypeName(band.DataType)
            for band in (
                ds.GetRasterBand(bidx)
                for bidx in range(1, ds.RasterCount + 1)
            )
        )

        if len(band_types) != 1:
            raise ValidationError(_("Complex data types are not supported."))

        src_osr = osr.SpatialReference()
        src_osr.ImportFromWkt(dsproj)
        dst_osr = osr.SpatialReference()
        dst_osr.ImportFromEPSG(int(self.srs.id))

        reproject = not src_osr.IsSame(dst_osr)

        fobj = FileObj(component='raster_layer')

        dst_file = env.raster_layer.workdir_filename(fobj, makedirs=True)
        self.fileobj = fobj

        if reproject:
            cmd = ['gdalwarp', '-of', 'GTiff',
                   '-t_srs', 'EPSG:%d' % self.srs.id]
            if ds.RasterCount == 3:
                cmd.append('-dstalpha')
        else:
            cmd = ['gdal_translate', '-of', 'GTiff']

        cmd.extend(('-co', 'COMPRESS=DEFLATE',
                    '-co', 'TILED=YES',
                    '-co', 'BIGTIFF=YES', filename, dst_file))
        subprocess.check_call(cmd)

        ds = gdal.Open(dst_file, gdalconst.GA_ReadOnly)

        self.dtype = band_types.pop()
        self.xsize = ds.RasterXSize
        self.ysize = ds.RasterYSize
        self.band_count = ds.RasterCount

        self.build_overview()

    def gdal_dataset(self):
        fn = env.raster_layer.workdir_filename(self.fileobj)
        return gdal.Open(fn, gdalconst.GA_ReadOnly)

    def build_overview(self, missing_only=False):
        fn = env.raster_layer.workdir_filename(self.fileobj)
        if missing_only and os.path.isfile(fn + '.ovr'):
            return

        cursize = max(self.xsize, self.ysize)
        multiplier = 2
        levels = []

        while cursize > PYRAMID_TARGET_SIZE:
            levels.append(str(multiplier))
            cursize /= 2
            multiplier *= 2

        cmd = ['gdaladdo', '-q', '-clean', fn]

        env.raster_layer.logger.debug('Removing existing overviews with command: ' + ' '.join(cmd))
        subprocess.check_call(cmd)

        cmd = [
            'gdaladdo', '-q', '-ro', '-r', 'cubic',
            '--config', 'COMPRESS_OVERVIEW', 'DEFLATE',
            '--config', 'INTERLEAVE_OVERVIEW', 'PIXEL',
            '--config', 'BIGTIFF_OVERVIEW', 'YES',
            fn
        ] + levels

        env.raster_layer.logger.debug('Building raster overview with command: ' + ' '.join(cmd))
        subprocess.check_call(cmd)

    def get_info(self):
        s = super(RasterLayer, self)
        return (s.get_info() if hasattr(s, 'get_info') else ()) + (
            (_("Data type"), self.dtype),
        )

    # IBboxLayer implementation:
    @property
    def extent(self):
        """Возвращает охват слоя
        """

        src_osr = osr.SpatialReference()
        dst_osr = osr.SpatialReference()

        src_osr.ImportFromEPSG(int(self.srs.id))
        dst_osr.ImportFromEPSG(4326)
        coordTrans = osr.CoordinateTransformation(src_osr, dst_osr)

        ds = self.gdal_dataset()
        geoTransform = ds.GetGeoTransform()

        # ul | ur: upper left | upper right
        # ll | lr: lower left | lower right
        x_ul = geoTransform[0]
        y_ul = geoTransform[3]

        x_lr = x_ul + ds.RasterXSize * geoTransform[1] + ds.RasterYSize * geoTransform[2]
        y_lr = y_ul + ds.RasterXSize * geoTransform[4] + ds.RasterYSize * geoTransform[5]

        ll = ogr.Geometry(ogr.wkbPoint)
        ll.AddPoint(x_ul, y_lr)
        ll.Transform(coordTrans)

        ur = ogr.Geometry(ogr.wkbPoint)
        ur.AddPoint(x_lr, y_ul)
        ur.Transform(coordTrans)

        extent = dict(
            minLon=ll.GetX(),
            maxLon=ur.GetX(),
            minLat=ll.GetY(),
            maxLat=ur.GetY()
        )

        return extent


class _source_attr(SP):

    def setter(self, srlzr, value):

        filedata, filemeta = env.file_upload.get_filename(value['id'])
        srlzr.obj.load_file(filedata, env)


P_DSS_READ = DataStructureScope.read
P_DSS_WRITE = DataStructureScope.write
P_DS_READ = DataScope.read
P_DS_WRITE = DataScope.write


class RasterLayerSerializer(Serializer):
    identity = RasterLayer.identity
    resclass = RasterLayer

    srs = SR(read=P_DSS_READ, write=P_DSS_WRITE)

    xsize = SP(read=P_DSS_READ)
    ysize = SP(read=P_DSS_READ)
    band_count = SP(read=P_DSS_READ)

    source = _source_attr(write=P_DS_WRITE)
