# -*- coding: utf-8 -*-
from __future__ import unicode_literals, print_function, absolute_import
import subprocess

import os
import os.path
from tempfile import NamedTemporaryFile
from shutil import copy

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

SUPPORTED_GDT = (gdalconst.GDT_Byte, )

SUPPORTED_GDT_NAMES = ', '.join([
    gdal.GetDataTypeName(i)
    for i in SUPPORTED_GDT])


class RasterLayer(Base, Resource, SpatialLayerMixin):
    identity = 'raster_layer'
    cls_display_name = _("Raster layer")

    __scope__ = (DataStructureScope, DataScope)

    implements(IBboxLayer)

    fileobj_id = sa.Column(sa.ForeignKey(FileObj.id), nullable=True)

    xsize = sa.Column(sa.Integer, nullable=False)
    ysize = sa.Column(sa.Integer, nullable=False)
    band_count = sa.Column(sa.Integer, nullable=False)

    fileobj = orm.relationship(FileObj, cascade='all')

    @classmethod
    def check_parent(cls, parent):
        return isinstance(parent, ResourceGroup)

    def load_file(self, filename, env):
        ds = gdal.Open(filename, gdalconst.GA_ReadOnly)
        if not ds:
            raise ValidationError(_("GDAL library was unable to open the file."))

        if ds.RasterCount not in (1, 3, 4):
            raise ValidationError(_("Only RGB, RGBA and single-band rasters are supported."))

        paletted = None
        if ds.RasterCount == 1:
            band = ds.GetRasterBand(1)
            paletted = band.GetRasterColorTable()
            if paletted is None:
                raise ValidationError(_("Only paletted single-band rasters are supported."))
        else:
            for bidx in range(1, ds.RasterCount + 1):
                band = ds.GetRasterBand(bidx)

                if band.DataType not in SUPPORTED_GDT:
                    raise ValidationError(_("Band #%(band)d has type '%(type)s', however only following band types are supported: %(all_types)s.") % dict(
                        band=bidx, type=gdal.GetDataTypeName(band.DataType), all_types=SUPPORTED_GDT_NAMES))

        dsproj = ds.GetProjection()
        dsgtran = ds.GetGeoTransform()

        if not dsproj or not dsgtran:
            raise ValidationError(_("Raster files without projection info are not supported."))

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

        cmd.extend(('-co', 'TILED=YES',
                    '-co', 'BIGTIFF=YES', filename, dst_file))
        subprocess.check_call(cmd)

        if paletted:
            # Convert paletted single-band image into RGBA image.
            # For a paletted TIFF with nodata, set the alpha component
            # of the color entry that matches the nodata value to 0.
            # https://trac.osgeo.org/gdal/changeset/28000 (GDAL 2.X)
            try:
                tf = NamedTemporaryFile()
                copy(dst_file, tf.name)

                cmd = ['gdal_translate', '-expand', 'rgba',
                       tf.name, dst_file]
                subprocess.check_call(cmd)
            finally:
                tf.close()

        ds = gdal.Open(dst_file, gdalconst.GA_ReadOnly)

        self.xsize = ds.RasterXSize
        self.ysize = ds.RasterYSize
        self.band_count = ds.RasterCount

        self.build_overview()

    def gdal_dataset(self):
        fn = env.raster_layer.workdir_filename(self.fileobj)
        return gdal.Open(fn, gdalconst.GA_ReadOnly)

    def build_overview(self):
        fn = env.raster_layer.workdir_filename(self.fileobj)
        ds = gdal.Open(fn, gdalconst.GA_ReadOnly)

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

        cmd = ['gdaladdo', '-q', '-ro', '-r', 'cubic',
            '--config', 'COMPRESS_OVERVIEW', 'JPEG',
            '--config', 'INTERLEAVE_OVERVIEW', 'PIXEL',
            '--config', 'BIGTIFF_OVERVIEW', 'YES',
            fn
        ] + levels

        env.raster_layer.logger.debug('Building raster overview with command: ' + ' '.join(cmd))
        subprocess.check_call(cmd)

    def get_info(self):
        s = super(RasterLayer, self)
        return (s.get_info() if hasattr(s, 'get_info') else ()) + (
            (_("File UUID"), self.fileobj.uuid),
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

        x_lr = x_ul + ds.RasterXSize*geoTransform[1] + ds.RasterYSize*geoTransform[2];
        y_lr = y_ul + ds.RasterXSize*geoTransform[4] + ds.RasterYSize*geoTransform[5];

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
