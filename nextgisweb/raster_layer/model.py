import os
import shutil
import subprocess
from pathlib import Path
from tempfile import NamedTemporaryFile
from warnings import warn

import sqlalchemy as sa
import sqlalchemy.orm as orm
from osgeo import gdal, gdalconst, ogr, osr
from zope.interface import implementer

from nextgisweb.env import COMP_ID, Base, _, env
from nextgisweb.lib.logging import logger
from nextgisweb.lib.osrhelper import SpatialReferenceError, sr_from_epsg, sr_from_wkt

from nextgisweb.core.exception import ValidationError
from nextgisweb.core.util import format_size
from nextgisweb.file_storage import FileObj
from nextgisweb.file_upload import FileUpload
from nextgisweb.layer import IBboxLayer, SpatialLayerMixin
from nextgisweb.resource import DataScope, DataStructureScope, Resource, ResourceGroup, Serializer
from nextgisweb.resource import SerializedProperty as SP
from nextgisweb.resource import SerializedRelationship as SR

from .kind_of_data import RasterLayerData
from .util import calc_overviews_levels, raster_size

Base.depends_on("resource")

PYRAMID_TARGET_SIZE = 512

SUPPORTED_DRIVERS = ("GTiff",)

COLOR_INTERPRETATION = {
    gdal.GCI_Undefined: "Undefined",
    gdal.GCI_GrayIndex: "GrayIndex",
    gdal.GCI_PaletteIndex: "PaletteIndex",
    gdal.GCI_RedBand: "Red",
    gdal.GCI_GreenBand: "Green",
    gdal.GCI_BlueBand: "Blue",
    gdal.GCI_AlphaBand: "Alpha",
    gdal.GCI_HueBand: "Hue",
    gdal.GCI_SaturationBand: "Saturation",
    gdal.GCI_LightnessBand: "Lightness",
    gdal.GCI_CyanBand: "Cyan",
    gdal.GCI_MagentaBand: "Magenta",
    gdal.GCI_YellowBand: "Yellow",
    gdal.GCI_BlackBand: "Black",
    gdal.GCI_YCbCr_YBand: "YCbCr_Y",
    gdal.GCI_YCbCr_CbBand: "YCbCr_Cb",
    gdal.GCI_YCbCr_CrBand: "YCbCr_Cr",
}


@implementer(IBboxLayer)
class RasterLayer(Base, Resource, SpatialLayerMixin):
    identity = "raster_layer"
    cls_display_name = _("Raster layer")

    __scope__ = (DataStructureScope, DataScope)

    fileobj_id = sa.Column(sa.ForeignKey(FileObj.id), nullable=True)

    xsize = sa.Column(sa.Integer, nullable=False)
    ysize = sa.Column(sa.Integer, nullable=False)
    dtype = sa.Column(sa.Unicode, nullable=False)
    band_count = sa.Column(sa.Integer, nullable=False)
    cog = sa.Column(sa.Boolean, nullable=False, default=False)

    fileobj = orm.relationship(FileObj, cascade="all")

    @classmethod
    def check_parent(cls, parent):
        return isinstance(parent, ResourceGroup)

    def load_file(self, filename, env_arg=None, *, cog=False):
        if isinstance(filename, Path):
            filename = str(filename)

        if env_arg is not None:
            warn(
                "RasterLayer.load_file's env_arg is deprecated since 4.7.0.dev7.",
                DeprecationWarning,
                stacklevel=2,
            )
        comp = env.raster_layer

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
                % dict(format=dsdriver.ShortName, all_formats=", ".join(SUPPORTED_DRIVERS))
            )

        if not dsproj or not dsgtran:
            raise ValidationError(_("Raster files without projection info are not supported."))

        # Workaround for broken encoding in WKT. Otherwise, it'll cause SWIG
        # TypeError (not a string) while passing to GDAL.
        try:
            dsproj.encode("utf-8", "strict")
        except UnicodeEncodeError:
            dsproj = dsproj.encode("utf-8", "replace").decode("utf-8")

        data_type = None
        alpha_band = None
        has_nodata = None
        mask_flags = []
        for bidx in range(1, ds.RasterCount + 1):
            band = ds.GetRasterBand(bidx)

            if data_type is None:
                data_type = band.DataType
            elif data_type != band.DataType:
                raise ValidationError(_("Mixed band data types are not supported."))

            mask_flags.append(band.GetMaskFlags())

            if band.GetRasterColorInterpretation() == gdal.GCI_AlphaBand:
                assert alpha_band is None, "Multiple alpha bands found!"
                alpha_band = bidx
            else:
                has_nodata = (has_nodata is None or has_nodata) and (
                    band.GetNoDataValue() is not None
                )

        # convert the mask band to the alpha band
        if mask_flags.count(gdal.GMF_PER_DATASET) == len(mask_flags):
            bands = [bidx for bidx in range(1, ds.RasterCount + 1)]
            bands.append("mask")
            alpha_band = len(bands)
            with NamedTemporaryFile(suffix=".tif", delete=False) as tf:
                topts = gdal.TranslateOptions(bandList=bands)
                ds = gdal.Translate(tf.name, ds, options=topts)
                ds.GetRasterBand(alpha_band).SetColorInterpretation(gdal.GCI_AlphaBand)
                ds = None
                shutil.move(tf.name, filename)
                ds = gdal.Open(filename, gdalconst.GA_ReadOnly)

        try:
            src_osr = sr_from_wkt(dsproj)
        except SpatialReferenceError:
            raise ValidationError(_("GDAL was uanble to parse the raster coordinate system."))

        if src_osr.IsLocal():
            raise ValidationError(
                _(
                    "The source raster has a local coordinate system and can't be "
                    "reprojected to the target coordinate system."
                )
            )

        dst_osr = self.srs.to_osr()

        reproject = not src_osr.IsSame(dst_osr)
        add_alpha = reproject and not has_nodata and alpha_band is None

        if reproject:
            cmd = ["gdalwarp", "-of", "GTiff", "-t_srs", "EPSG:%d" % self.srs.id]
            if add_alpha:
                cmd.append("-dstalpha")
            ds_measure = gdal.AutoCreateWarpedVRT(ds, src_osr.ExportToWkt(), dst_osr.ExportToWkt())
            if ds_measure is None:
                message = _("Failed to reproject the raster to the target coordinate system.")
                gdal_err = gdal.GetLastErrorMsg().strip()
                if gdal_err != "":
                    message += " " + _("GDAL error message: %s") % gdal_err
                raise ValidationError(message=message)
        else:
            cmd = ["gdal_translate", "-of", "GTiff"]
            ds_measure = ds

        size_expected = raster_size(
            ds_measure,
            1 if add_alpha else 0,
            data_type=data_type if gdal.VersionInfo() < "3030300" else None,
        )  # https://github.com/OSGeo/gdal/issues/4469
        ds_measure = None

        size_limit = comp.options["size_limit"]
        if size_limit is not None and size_expected > size_limit:
            raise ValidationError(
                message=_(
                    "The uncompressed raster size (%(size)s) exceeds the limit "
                    "(%(limit)s) by %(delta)s. Reduce raster size to fit the limit."
                )
                % dict(
                    size=format_size(size_expected),
                    limit=format_size(size_limit),
                    delta=format_size(size_expected - size_limit),
                )
            )

        cmd.extend(("-co", "COMPRESS=DEFLATE", "-co", "TILED=YES", "-co", "BIGTIFF=YES", filename))

        fobj = FileObj(component="raster_layer")
        dst_file = str(comp.workdir_path(fobj, makedirs=True))
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

                cmd = ["gdal_translate", "-of", "Gtiff"]
                cmd.extend(
                    (
                        "-co",
                        "COMPRESS=DEFLATE",
                        "-co",
                        "TILED=YES",
                        "-co",
                        "BIGTIFF=YES",
                        "-co",
                        "COPY_SRC_OVERVIEWS=YES",
                        tmp_file,
                        dst_file,
                    )
                )
                subprocess.check_call(cmd)
                os.unlink(tmp_file + ".ovr")

        ds = gdal.Open(dst_file, gdalconst.GA_ReadOnly)

        assert raster_size(ds) == size_expected, "Expected size mismatch"

        self.dtype = gdal.GetDataTypeName(data_type)
        self.xsize = ds.RasterXSize
        self.ysize = ds.RasterYSize
        self.band_count = ds.RasterCount

    def gdal_dataset(self):
        fn = env.raster_layer.workdir_path(self.fileobj)
        return gdal.Open(str(fn), gdalconst.GA_ReadOnly)

    def build_overview(self, missing_only=False, fn=None):
        if fn is None and self.cog:
            return

        if fn is None:
            fn = env.raster_layer.workdir_path(self.fileobj)

        if missing_only and fn.with_suffix(".ovr").exists():
            return

        ds = gdal.Open(str(fn), gdalconst.GA_ReadOnly)
        levels = list(map(str, calc_overviews_levels(ds)))

        cmd = ["gdaladdo", "-q", "-clean", str(fn)]

        logger.debug("Removing existing overviews with command: " + " ".join(cmd))
        subprocess.check_call(cmd)

        # IMPORTANT: "nearest" method does not create new values by averaging.
        # It is the best choice to preserve initial pixel values for thematic
        # data. However, this method is not well-suited for the continuous
        # nature of satellite imagery, providing less visually pleasing and
        # analytically accurate results. We need to develop a heuristic to
        # distinguish different types of raster data and select the appropriate
        # resampling method. For now, using "nearest" is the safest option to
        # avoid altering pixel values.
        resampling = "nearest"
        ds = None

        cmd = [
            "gdaladdo",
            "-q",
            "-ro",
            "-r",
            resampling,
            "--config",
            "COMPRESS_OVERVIEW",
            "DEFLATE",
            "--config",
            "INTERLEAVE_OVERVIEW",
            "PIXEL",
            "--config",
            "BIGTIFF_OVERVIEW",
            "YES",
            str(fn),
        ] + levels

        logger.debug("Building raster overview with command: " + " ".join(cmd))
        subprocess.check_call(cmd)

    def get_info(self):
        s = super()
        return (s.get_info() if hasattr(s, "get_info") else ()) + (
            (_("Data type"), self.dtype),
            (_("COG"), self.cog),
        )

    # IBboxLayer implementation:
    @property
    def extent(self):
        """Возвращает охват слоя"""

        src_osr = self.srs.to_osr()
        dst_osr = sr_from_epsg(4326)

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

        extent = dict(minLon=ll.GetX(), maxLon=ur.GetX(), minLat=ll.GetY(), maxLat=ur.GetY())

        return extent


def estimate_raster_layer_data(resource):
    fn = env.raster_layer.workdir_path(resource.fileobj)
    return fn.stat().st_size + (0 if resource.cog else fn.with_suffix(".ovr").stat().st_size)


class _source_attr(SP):
    def setter(self, srlzr, value):
        cur_size = 0 if srlzr.obj.id is None else estimate_raster_layer_data(srlzr.obj)

        cog = srlzr.data.get("cog", env.raster_layer.cog_enabled)
        srlzr.obj.load_file(FileUpload(id=value["id"]).data_path, cog=cog)

        new_size = estimate_raster_layer_data(srlzr.obj)
        size = new_size - cur_size

        size = estimate_raster_layer_data(srlzr.obj)
        env.core.reserve_storage(
            COMP_ID, RasterLayerData, value_data_volume=size, resource=srlzr.obj
        )


class _cog_attr(SP):
    def setter(self, srlzr, value):
        if (
            srlzr.data.get("source") is None
            and srlzr.obj.id is not None
            and value != srlzr.obj.cog
        ):
            cur_size = estimate_raster_layer_data(srlzr.obj)

            fn = env.raster_layer.workdir_path(srlzr.obj.fileobj)
            srlzr.obj.load_file(fn, cog=value)

            new_size = estimate_raster_layer_data(srlzr.obj)
            size = new_size - cur_size

            env.core.reserve_storage(
                COMP_ID, RasterLayerData, value_data_volume=size, resource=srlzr.obj
            )
        else:
            # Just do nothing, _source_attr serializer will handle the value.
            pass


class _color_interpretation(SP):
    def getter(self, srlzr):
        fdata = env.raster_layer.workdir_path(srlzr.obj.fileobj)
        ds = gdal.OpenEx(str(fdata))
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
    dtype = SP(read=P_DSS_READ)
    color_interpretation = _color_interpretation(read=P_DSS_READ)

    source = _source_attr(write=P_DS_WRITE)
    cog = _cog_attr(read=P_DSS_READ, write=P_DS_WRITE)
