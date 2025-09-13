import glob
import os
import subprocess
from functools import cached_property
from pathlib import Path
from tempfile import NamedTemporaryFile
from typing import List, Literal, Union
from warnings import warn
from zipfile import ZipFile, is_zipfile

import sqlalchemy as sa
import sqlalchemy.dialects.postgresql as sa_pg
import sqlalchemy.orm as orm
from affine import Affine
from msgspec import UNSET, Struct
from osgeo import gdal, gdalconst, ogr, osr
from zope.interface import implementer

from nextgisweb.env import COMP_ID, Base, env, gettext, gettextf, ngettextf
from nextgisweb.lib.logging import logger
from nextgisweb.lib.osrhelper import SpatialReferenceError, sr_from_epsg, sr_from_wkt
from nextgisweb.lib.saext import Msgspec

from nextgisweb.core.exception import ValidationError
from nextgisweb.core.util import format_size
from nextgisweb.file_storage import FileObj
from nextgisweb.file_upload import FileUploadRef
from nextgisweb.layer import IBboxLayer, SpatialLayerMixin
from nextgisweb.resource import (
    CRUTypes,
    DataScope,
    Resource,
    ResourceGroup,
    ResourceScope,
    SAttribute,
    SColumn,
    Serializer,
    SRelationship,
)

from .kind_of_data import RasterLayerData
from .util import band_color_interp, calc_overviews_levels, raster_size

Base.depends_on("resource")

PYRAMID_TARGET_SIZE = 512

SUPPORTED_DRIVERS = ("GTiff", "PNG", "JPEG")


class RasterBand(Struct):
    color_interp: str
    min: float
    max: float
    rat: bool
    no_data: float | Literal["NaN"] | None = None


class RasterLayerMeta(Struct):
    bands: list[RasterBand]


@implementer(IBboxLayer)
class RasterLayer(Base, Resource, SpatialLayerMixin):
    identity = "raster_layer"
    cls_display_name = gettext("Raster layer")
    cls_order = 65

    __scope__ = DataScope

    fileobj_id = sa.Column(sa.ForeignKey(FileObj.id), nullable=True)
    fileobj_pam_id = sa.Column(sa.ForeignKey(FileObj.id), nullable=True)

    xsize = sa.Column(sa.Integer, nullable=False)
    ysize = sa.Column(sa.Integer, nullable=False)
    dtype = sa.Column(sa.Unicode, nullable=False)
    band_count = sa.Column(sa.Integer, nullable=False)
    geo_transform = sa.Column(
        sa_pg.ARRAY(sa.FLOAT, dimensions=1, zero_indexes=True),
        nullable=True,
    )
    cog = sa.Column(sa.Boolean, nullable=False, default=False)

    meta = sa.Column(Msgspec(RasterLayerMeta), nullable=True)

    fileobj = orm.relationship(FileObj, foreign_keys=fileobj_id, cascade="all")
    fileobj_pam = orm.relationship(FileObj, foreign_keys=fileobj_pam_id, cascade="all")

    @classmethod
    def check_parent(cls, parent):
        return isinstance(parent, ResourceGroup)

    def load_file(self, filename, env_arg=None, *, cog=False):
        if isinstance(filename, Path):
            filename = str(filename)

        if is_zipfile(filename):
            zip_filename = "/vsizip/{%s}" % filename
            supported_extensions = set(
                ext
                for driver_name in SUPPORTED_DRIVERS
                for ext in gdal.GetDriverByName(driver_name)
                .GetMetadata()
                .get("DMD_EXTENSIONS", "")
                .split()
            )
            # Assuming extensions are present and correctly indicate file types
            supported_zip_items = []
            for zip_item in gdal.ReadDir(zip_filename):
                zip_item_ext = Path(zip_item).suffix.removeprefix(".")
                if zip_item_ext.lower() in supported_extensions:
                    supported_zip_items.append(zip_item)
            if not supported_zip_items:
                raise ValidationError(gettext("No supported files found in the archive."))
            if len(supported_zip_items) > 1:
                raise ValidationError(
                    gettextf(
                        "The archive contains multiple supported files: {supported_zip_items}."
                    )(supported_zip_items=", ".join(supported_zip_items))
                )
            filename = f"{zip_filename}/{supported_zip_items[0]}"

        if env_arg is not None:
            warn(
                "RasterLayer.load_file's env_arg is deprecated since 4.7.0.dev7.",
                DeprecationWarning,
                stacklevel=2,
            )
        comp = env.raster_layer

        ds = gdal.OpenEx(filename, gdalconst.GA_ReadOnly, allowed_drivers=SUPPORTED_DRIVERS)
        if not ds:
            raise ValidationError(gettext("GDAL library was unable to open the file."))

        dsproj = ds.GetProjection()
        dsgtran = ds.GetGeoTransform()

        if not dsproj or not dsgtran:
            raise ValidationError(
                gettext("Raster files without projection info are not supported.")
            )

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
                raise ValidationError(gettext("Mixed band data types are not supported."))

            mask_flags.append(band.GetMaskFlags())

            if band.GetRasterColorInterpretation() == gdal.GCI_AlphaBand:
                assert alpha_band is None, "Multiple alpha bands found!"
                alpha_band = bidx
            else:
                has_nodata = (has_nodata is None or has_nodata) and (
                    band.GetNoDataValue() is not None
                )

        # Convert the mask band to the alpha band
        if mask_flags.count(gdal.GMF_PER_DATASET) == len(mask_flags):
            bands = [bidx for bidx in range(1, ds.RasterCount + 1)]
            bands.append("mask")
            alpha_band = len(bands)
            with NamedTemporaryFile(suffix=".tif", delete=False) as tf:
                topts = gdal.TranslateOptions(bandList=bands)
                ds = gdal.Translate(tf.name, ds, options=topts)
                ds.GetRasterBand(alpha_band).SetColorInterpretation(gdal.GCI_AlphaBand)
                ds = None

                # gdal.Translate may generate auxiliary files (e.g., .aux.xml)
                # to store metadata or additional info - we include all such
                # files in the ZIP archive to ensure nothing is lost.
                base, _ = os.path.splitext(tf.name)
                ds_files = glob.glob(base + ".*")
                if filename.startswith("/vsizip/"):
                    filename = filename[filename.find("{") + 1 : filename.find("}")]
                with ZipFile(filename, "w") as zf:
                    for file in ds_files:
                        zf.write(file, arcname=os.path.basename(file))
                        os.remove(file)

                zip_filename = "/vsizip/{%s}" % filename
                filename = f"{zip_filename}/{os.path.basename(tf.name)}"
                ds = gdal.Open(filename, gdalconst.GA_ReadOnly)

        try:
            src_osr = sr_from_wkt(dsproj)
            if src_osr.IsLocal() and (code := src_osr.GetAuthorityCode(None)) is not None:
                # The coordinate system may be interpreted as 'local' when the
                # definitions from EPSG code and GeoTIFF keys are inconsistent.
                # Starting with GDAL 3.5, the GTIFF_SRS_SOURCE configuration
                # option can be used to control this behavior.
                src_osr = sr_from_epsg(int(code))
        except SpatialReferenceError:
            raise ValidationError(
                gettext("GDAL was unable to parse the raster coordinate system.")
            )

        if src_osr.IsLocal():
            raise ValidationError(
                gettext(
                    "The source raster has a local coordinate system and can't be "
                    "reprojected to the target coordinate system."
                )
            )

        dst_osr = self.srs.to_osr()

        reproject = not src_osr.IsSame(dst_osr)
        rectilinear = Affine.from_gdal(*dsgtran).is_rectilinear
        add_alpha = reproject and not has_nodata and alpha_band is None

        if reproject or not rectilinear:
            cmd = ["gdalwarp", "-of", "GTiff", "-t_srs", "EPSG:%d" % self.srs.id]
            if add_alpha:
                cmd.append("-dstalpha")
            ds_measure = gdal.AutoCreateWarpedVRT(ds, src_osr.ExportToWkt(), dst_osr.ExportToWkt())
            if ds_measure is None:
                message = gettext(
                    "Failed to reproject the raster to the target coordinate system."
                )
                gdal_err = gdal.GetLastErrorMsg().strip()
                if gdal_err != "":
                    message += " " + gettext("GDAL error message: %s") % gdal_err
                raise ValidationError(message=message)
        else:
            cmd = ["gdal_translate", "-of", "GTiff"]
            ds_measure = ds

        size_expected = raster_size(
            ds_measure,
            1 if add_alpha else 0,
            data_type=data_type if gdal.VersionInfo() < "3030300" else None,
        )  # https://github.com/OSGeo/gdal/issues/4469

        size_limit = comp.options["size_limit"]
        if size_limit is not None and size_expected > size_limit:
            raise ValidationError(
                message=gettextf(
                    "The uncompressed raster size ({size}) exceeds the limit "
                    "({limit}) by {delta}. Reduce raster size to fit the limit."
                )(
                    size=format_size(size_expected),
                    limit=format_size(size_limit),
                    delta=format_size(size_expected - size_limit),
                )
            )

        cmd.extend(("-co", "COMPRESS=DEFLATE", "-co", "TILED=YES", "-co", "BIGTIFF=YES", filename))

        fobj = FileObj(component="raster_layer")
        dst_file = str(comp.workdir_path(fobj, None, makedirs=True))
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

        # GDAL Persistent Auxiliary Metadata (PAM)
        if os.path.exists(aux_xml_file := dst_file + ".aux.xml"):
            fobj_pam = FileObj(component="raster_layer")
            fobj_pam = fobj_pam.copy_from(aux_xml_file)
            self.fileobj_pam = fobj_pam
            comp.workdir_path(fobj, fobj_pam, makedirs=True)
        else:
            # Cleanup PAM FileObj reference on replace
            self.fileobj_pam = None

        ds = gdal.Open(dst_file, gdalconst.GA_ReadOnly)

        try:
            assert raster_size(ds) == size_expected, "Expected size mismatch"
        except AssertionError:
            # https://github.com/OSGeo/gdal/commit/6b5f015195ccf683b6ca5ab6a8425921516225c1
            band = ds.GetRasterBand(1)
            band_measure = ds_measure.GetRasterBand(1)
            if band.DataType != band_measure.DataType:
                logger.error(
                    "Data type changed during warp from '%s' to '%s' (nodata: '%s')",
                    gdal.GetDataTypeName(band.DataType),
                    gdal.GetDataTypeName(band_measure.DataType),
                    band.GetNoDataValue(),
                )
            else:
                raise
        finally:
            ds_measure = None

        self.dtype = gdal.GetDataTypeName(data_type)
        self.xsize = ds.RasterXSize
        self.ysize = ds.RasterYSize
        self.band_count = ds.RasterCount
        self.geo_transform = list(ds.GetGeoTransform())

        bands = []
        for bidx in range(1, ds.RasterCount + 1):
            band = ds.GetRasterBand(bidx)
            minval, maxval = band.ComputeRasterMinMax(approx_ok=False)
            bands.append(
                RasterBand(
                    color_interp=band_color_interp(band),
                    no_data=band.GetNoDataValue(),
                    rat=band.GetDefaultRAT() is not None,
                    min=minval,
                    max=maxval,
                )
            )
        self.meta = RasterLayerMeta(bands=bands)

    def gdal_dataset(self):
        fn = env.raster_layer.workdir_path(self.fileobj, self.fileobj_pam)
        return gdal.Open(str(fn), gdalconst.GA_ReadOnly)

    def build_overview(self, missing_only=False, fn=None):
        if fn is None and self.cog:
            return

        if fn is None:
            fn = env.raster_layer.workdir_path(self.fileobj, self.fileobj_pam)

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
        band_summary = ngettextf(
            "{n} band with {t} data type",
            "{n} bands with {t} data type",
            self.band_count,
        )
        return (
            *(s() if (s := getattr(super(), "get_info", None)) else ()),
            (gettext("Band summary"), band_summary(n=self.band_count, t=self.dtype)),
            (gettext("Pixel dimensions"), "{} × {}".format(self.xsize, self.ysize)),
            (gettext("Cloud Optimized GeoTIFF (COG)"), bool(self.cog)),
            (gettext("Persistent auxiliary metadata (PAM)"), bool(self.fileobj_pam)),
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

    def _check_integrity(self):
        ds = self.gdal_dataset()
        if ds is None:
            return "Can't read dataset"
        if self.xsize != ds.RasterXSize:
            return "Size X mismatch"
        if self.ysize != ds.RasterYSize:
            return "Size Y mismatch"

        dt = gdal.GetDataTypeByName(self.dtype)
        for bidx in range(1, self.band_count + 1):
            band = ds.GetRasterBand(bidx)
            if band is None:
                return f"Can't read band #{bidx}"
            if band.DataType != dt:
                return f"Band #{bidx} data type mismatch"


def estimate_raster_layer_data(resource):
    fn = env.raster_layer.workdir_path(resource.fileobj, resource.fileobj_pam)
    return fn.stat().st_size + (0 if resource.cog else fn.with_suffix(".ovr").stat().st_size)


class SourceAttr(SAttribute):
    ctypes = CRUTypes(FileUploadRef, FileUploadRef, FileUploadRef)

    def set(self, srlzr: Serializer, value: FileUploadRef, *, create: bool):
        cur_size = 0 if create else estimate_raster_layer_data(srlzr.obj)

        cog = srlzr.data.cog
        if cog is UNSET or cog is None:
            cog = env.raster_layer.cog_enabled if cog is None or create else srlzr.obj.cog
        srlzr.obj.load_file(value().data_path, cog=cog)

        new_size = estimate_raster_layer_data(srlzr.obj)
        env.core.reserve_storage(
            COMP_ID,
            RasterLayerData,
            value_data_volume=new_size - cur_size,
            resource=srlzr.obj,
        )


class CogAttr(SColumn):
    ctypes = CRUTypes(Union[bool, None], bool, Union[bool, None])

    def set(self, srlzr: Serializer, value: Union[bool, None], *, create: bool):
        if srlzr.data.source is not UNSET or create:
            return  # Just do nothing, SourceAttr will set the cog attribute

        if value is None:
            value = env.raster_layer.cog_enabled
        if srlzr.obj.cog == value:
            return

        cur_size = estimate_raster_layer_data(srlzr.obj)
        fn = env.raster_layer.workdir_path(srlzr.obj.fileobj, srlzr.obj.fileobj_pam)
        srlzr.obj.load_file(fn, cog=value)

        new_size = estimate_raster_layer_data(srlzr.obj)
        env.core.reserve_storage(
            COMP_ID,
            RasterLayerData,
            value_data_volume=new_size - cur_size,
            resource=srlzr.obj,
        )


class GeoTransform(SAttribute):
    ctypes = CRUTypes(List[str], List[str], List[str])

    def get(self, srlzr: Serializer) -> List[str]:
        return (
            srlzr.obj.geo_transform
            if srlzr.obj.geo_transform is not None
            else list(srlzr._gdal_dataset.GetGeoTransform())
        )


class Bands(SAttribute):
    ctypes = CRUTypes(List[str], List[str], List[str])

    def get(self, srlzr: Serializer) -> List[str]:
        return srlzr.obj.meta.bands if srlzr.obj.meta is not None else []


class ColorInterpretation(SAttribute):
    ctypes = CRUTypes(List[str], List[str], List[str])

    def get(self, srlzr: Serializer) -> List[str]:
        return (
            [band.color_interp for band in srlzr.obj.meta.bands]
            if srlzr.obj.meta is not None
            else [
                band_color_interp(srlzr._gdal_dataset.GetRasterBand(bidx))
                for bidx in range(1, srlzr._gdal_dataset.RasterCount + 1)
            ]
        )


class RasterLayerSerializer(Serializer, resource=RasterLayer):
    srs = SRelationship(read=ResourceScope.read, write=ResourceScope.update)

    xsize = SColumn(read=ResourceScope.read)
    ysize = SColumn(read=ResourceScope.read)
    band_count = SColumn(read=ResourceScope.read)
    dtype = SColumn(read=ResourceScope.read)
    geo_transform = GeoTransform(read=ResourceScope.read)

    bands = Bands(read=ResourceScope.read)

    source = SourceAttr(write=DataScope.write, required=True)
    cog = CogAttr(read=ResourceScope.read, write=ResourceScope.update)

    # TODO: After the maintenance process completes and the 'meta' column
    # is populated, update the frontend to use the 'bands' property
    # and remove 'color_interpretation' from the API
    color_interpretation = ColorInterpretation(read=ResourceScope.read)

    # TODO: Remove when metadata columns are consistently populated
    @cached_property
    def _gdal_dataset(self):
        obj = self.obj
        assert obj.meta is None and obj.geo_transform is None
        return obj.gdal_dataset()
