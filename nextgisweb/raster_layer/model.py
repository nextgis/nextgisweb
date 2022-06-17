import subprocess
import os

import sqlalchemy as sa
import sqlalchemy.orm as orm

from zope.interface import implementer

from collections import OrderedDict
from tempfile import NamedTemporaryFile
from osgeo import gdal, gdalconst, osr, ogr

from ..core.exception import ValidationError
from ..core.util import format_size
from ..lib.osrhelper import traditional_axis_mapping
from ..lib.logging import logger
from ..models import declarative_base
from ..resource import (
    Resource,
    DataStructureScope, DataScope,
    Serializer,
    SerializedProperty as SP,
    SerializedRelationship as SR,
    ResourceGroup)
from ..env import env
from ..layer import SpatialLayerMixin, IBboxLayer
from ..file_storage import FileObj

from .kind_of_data import RasterLayerData
from .util import _, calc_overviews_levels, COMP_ID, raster_size

PYRAMID_TARGET_SIZE = 512

Base = declarative_base(dependencies=('resource', ))

SUPPORTED_DRIVERS = ('GTiff', )

COLOR_INTERPRETATION = OrderedDict((
    (gdal.GCI_Undefined, 'Undefined'),
    (gdal.GCI_GrayIndex, 'GrayIndex'),
    (gdal.GCI_PaletteIndex, 'PaletteIndex'),
    (gdal.GCI_RedBand, 'Red'),
    (gdal.GCI_GreenBand, 'Green'),
    (gdal.GCI_BlueBand, 'Blue'),
    (gdal.GCI_AlphaBand, 'Alpha'),
    (gdal.GCI_HueBand, 'Hue'),
    (gdal.GCI_SaturationBand, 'Saturation'),
    (gdal.GCI_LightnessBand, 'Lightness'),
    (gdal.GCI_CyanBand, 'Cyan'),
    (gdal.GCI_MagentaBand, 'Magenta'),
    (gdal.GCI_YellowBand, 'Yellow'),
    (gdal.GCI_BlackBand, 'Black'),
    (gdal.GCI_YCbCr_YBand, 'YCbCr_Y'),
    (gdal.GCI_YCbCr_CbBand, 'YCbCr_Cb'),
    (gdal.GCI_YCbCr_CrBand, 'YCbCr_Cr')))


@implementer(IBboxLayer)
class RasterLayer(Base, Resource, SpatialLayerMixin):
    identity = 'raster_layer'
    cls_display_name = _("Raster layer")

    __scope__ = (DataStructureScope, DataScope)

    fileobj_id = sa.Column(sa.ForeignKey(FileObj.id), nullable=True)

    xsize = sa.Column(sa.Integer, nullable=False)
    ysize = sa.Column(sa.Integer, nullable=False)
    dtype = sa.Column(sa.Unicode, nullable=False)
    band_count = sa.Column(sa.Integer, nullable=False)
    cog = sa.Column(sa.Boolean, nullable=False, default=False)

    fileobj = orm.relationship(FileObj, cascade='all')

    @classmethod
    def check_parent(cls, parent):
        return isinstance(parent, ResourceGroup)

    def load_file(self, filename, env, cog=False):
        ds = gdal.Open(filename, gdalconst.GA_ReadOnly)
        if not ds:
            raise ValidationError(_("GDAL library was unable to open the file."))

        dsdriver = ds.GetDriver()
        dsproj = ds.GetProjection()
        dsgtran = ds.GetGeoTransform()

        if dsdriver.ShortName not in SUPPORTED_DRIVERS:
            raise ValidationError(
                _("Raster has format '%(format)s', however only following formats are supported: %(all_formats)s.")  # NOQA: E501
                % dict(format=dsdriver.ShortName, all_formats=", ".join(SUPPORTED_DRIVERS))
            )

        if not dsproj or not dsgtran:
            raise ValidationError(_("Raster files without projection info are not supported."))

        # Workaround for broken encoding in WKT. Otherwise, it'll cause SWIG
        # TypeError (not a string) while passing to GDAL.
        try:
            dsproj.encode('utf-8', 'strict')
        except UnicodeEncodeError:
            dsproj = dsproj.encode('utf-8', 'replace').decode('utf-8')

        data_type = None
        alpha_band = None
        has_nodata = None
        for bidx in range(1, ds.RasterCount + 1):
            band = ds.GetRasterBand(bidx)

            if data_type is None:
                data_type = band.DataType
            elif data_type != band.DataType:
                raise ValidationError(_("Mixed band data types are not supported."))

            if band.GetRasterColorInterpretation() == gdal.GCI_AlphaBand:
                assert alpha_band is None, "Multiple alpha bands found!"
                alpha_band = bidx
            else:
                has_nodata = (has_nodata is None or has_nodata) and (
                    band.GetNoDataValue() is not None)

        src_osr = osr.SpatialReference()
        if src_osr.ImportFromWkt(dsproj) != 0:
            raise ValidationError(_(
                "GDAL was uanble to parse the raster coordinate system."))

        if src_osr.IsLocal():
            raise ValidationError(_(
                "The source raster has a local coordinate system and can't be "
                "reprojected to the target coordinate system."))

        dst_osr = self.srs.to_osr()

        reproject = not src_osr.IsSame(dst_osr)
        add_alpha = reproject and not has_nodata and alpha_band is None

        if reproject:
            cmd = ['gdalwarp', '-of', 'GTiff', '-t_srs', 'EPSG:%d' % self.srs.id]
            if add_alpha:
                cmd.append('-dstalpha')
            ds_measure = gdal.AutoCreateWarpedVRT(
                ds, src_osr.ExportToWkt(), dst_osr.ExportToWkt())
            if ds_measure is None:
                message = _("Failed to reproject the raster to the target coordinate system.")
                gdal_err = gdal.GetLastErrorMsg().strip()
                if gdal_err != '':
                    message += ' ' + _("GDAL error message: %s") % gdal_err
                raise ValidationError(message=message)
        else:
            cmd = ['gdal_translate', '-of', 'GTiff']
            ds_measure = ds

        size_expected = raster_size(ds_measure, 1 if add_alpha else 0)
        ds_measure = None

        size_limit = env.raster_layer.options['size_limit']
        if size_limit is not None and size_expected > size_limit:
            raise ValidationError(message=_(
                "The uncompressed raster size (%(size)s) exceeds the limit "
                "(%(limit)s) by %(delta)s. Reduce raster size to fit the limit."
            ) % dict(
                size=format_size(size_expected),
                limit=format_size(size_limit),
                delta=format_size(size_expected - size_limit),
            ))

        cmd.extend(('-co', 'COMPRESS=DEFLATE',
                    '-co', 'TILED=YES',
                    '-co', 'BIGTIFF=YES', filename))

        fobj = FileObj(component='raster_layer')
        dst_file = env.raster_layer.workdir_filename(fobj, makedirs=True)
        self.fileobj = fobj

        self.cog = cog
        if not cog:
            subprocess.check_call(cmd + [dst_file])
            self.build_overview()
        else:
            # TODO: COG driver
            with NamedTemporaryFile() as tf:
                tmp_file = tf.name
                subprocess.check_call(cmd + [tmp_file])
                self.build_overview(fn=tmp_file)

                cmd = ['gdal_translate', '-of', 'Gtiff']
                cmd.extend(('-co', 'COMPRESS=DEFLATE',
                            '-co', 'TILED=YES',
                            '-co', 'BIGTIFF=YES',
                            '-co', 'COPY_SRC_OVERVIEWS=YES', tmp_file, dst_file))
                subprocess.check_call(cmd)
                os.unlink(tmp_file + '.ovr')

        ds = gdal.Open(dst_file, gdalconst.GA_ReadOnly)

        assert raster_size(ds) == size_expected, "Expected size mismatch"

        self.dtype = gdal.GetDataTypeName(data_type)
        self.xsize = ds.RasterXSize
        self.ysize = ds.RasterYSize
        self.band_count = ds.RasterCount

    def gdal_dataset(self):
        fn = env.raster_layer.workdir_filename(self.fileobj)
        return gdal.Open(fn, gdalconst.GA_ReadOnly)

    def build_overview(self, missing_only=False, fn=None):
        if fn is None and self.cog:
            return

        if fn is None:
            fn = env.raster_layer.workdir_filename(self.fileobj)

        if missing_only and os.path.isfile(fn + '.ovr'):
            return

        ds = gdal.Open(fn, gdalconst.GA_ReadOnly)
        levels = list(map(str, calc_overviews_levels(ds)))
        ds = None

        cmd = ['gdaladdo', '-q', '-clean', fn]

        logger.debug('Removing existing overviews with command: ' + ' '.join(cmd))
        subprocess.check_call(cmd)

        cmd = [
            'gdaladdo', '-q', '-ro', '-r', 'gauss',
            '--config', 'COMPRESS_OVERVIEW', 'DEFLATE',
            '--config', 'INTERLEAVE_OVERVIEW', 'PIXEL',
            '--config', 'BIGTIFF_OVERVIEW', 'YES',
            fn
        ] + levels

        logger.debug('Building raster overview with command: ' + ' '.join(cmd))
        subprocess.check_call(cmd)

    def get_info(self):
        s = super()
        return (s.get_info() if hasattr(s, 'get_info') else ()) + (
            (_("Data type"), self.dtype),
            (_("COG"), self.cog),
        )

    # IBboxLayer implementation:
    @property
    def extent(self):
        """Возвращает охват слоя
        """

        src_osr = self.srs.to_osr()

        dst_osr = osr.SpatialReference()
        dst_osr.ImportFromEPSG(4326)

        traditional_axis_mapping(src_osr)
        traditional_axis_mapping(dst_osr)

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


def estimate_raster_layer_data(resource):

    def file_size(fn):
        stat = os.stat(fn)
        return stat.st_size

    fn = env.raster_layer.workdir_filename(resource.fileobj)

    # Size of source file with overviews
    size = file_size(fn)
    if not resource.cog:
        size += file_size(fn + '.ovr')
    return size


class _source_attr(SP):

    def setter(self, srlzr, value):
        cog = srlzr.data.get("cog", env.raster_layer.cog_enabled)

        filedata, filemeta = env.file_upload.get_filename(value['id'])
        srlzr.obj.load_file(filedata, env, cog)

        size = estimate_raster_layer_data(srlzr.obj)
        env.core.reserve_storage(COMP_ID, RasterLayerData, value_data_volume=size,
                                 resource=srlzr.obj)


class _cog_attr(SP):

    def setter(self, srlzr, value):
        if (
            srlzr.data.get("source") is None
            and srlzr.obj.id is not None
            and value != srlzr.obj.cog
        ):
            fn = env.raster_layer.workdir_filename(srlzr.obj.fileobj)
            srlzr.obj.load_file(fn, env, value)

            size = estimate_raster_layer_data(srlzr.obj)
            env.core.reserve_storage(
                COMP_ID, RasterLayerData, value_data_volume=size, resource=srlzr.obj
            )
        else:
            # Just do nothing, _source_attr serializer will handle the value.
            pass


class _color_interpretation(SP):

    def getter(self, srlzr):
        ds = gdal.OpenEx(env.raster_layer.workdir_filename(srlzr.obj.fileobj))
        return [
            COLOR_INTERPRETATION[ds.GetRasterBand(bidx).GetRasterColorInterpretation()]
            for bidx in range(1, srlzr.obj.band_count + 1)
        ]


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
    color_interpretation = _color_interpretation(read=P_DSS_READ)

    source = _source_attr(write=P_DS_WRITE)
    cog = _cog_attr(read=P_DSS_READ, write=P_DS_WRITE)
