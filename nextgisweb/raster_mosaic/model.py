from pathlib import Path
from typing import List, Union

import geoalchemy2 as ga
import sqlalchemy as sa
import sqlalchemy.orm as orm
from msgspec import UNSET, Struct, UnsetType
from osgeo import gdal
from sqlalchemy import func
from sqlalchemy.ext.orderinglist import ordering_list
from zope.interface import implementer

from nextgisweb.env import COMP_ID, Base, DBSession, env, gettext
from nextgisweb.lib.geometry import Geometry
from nextgisweb.lib.osrhelper import sr_from_wkt

from nextgisweb.core.exception import ValidationError
from nextgisweb.file_storage import FileObj
from nextgisweb.file_upload import FileUploadRef
from nextgisweb.layer import IBboxLayer, SpatialLayerMixin
from nextgisweb.raster_layer.util import calc_overviews_levels
from nextgisweb.resource import (
    DataScope,
    Resource,
    ResourceGroup,
    ResourceScope,
    SAttribute,
    Serializer,
    SRelationship,
)

SUPPORTED_DRIVERS = ("GTiff",)


@implementer(IBboxLayer)
class RasterMosaic(Base, Resource, SpatialLayerMixin):
    identity = "raster_mosaic"
    cls_display_name = gettext("Raster mosaic")

    __scope__ = DataScope

    @classmethod
    def check_parent(cls, parent):
        return isinstance(parent, ResourceGroup)

    def gdal_dataset(self, extent=None, size=None):
        if extent is not None and size is not None:
            xmin, ymin, xmax, ymax = extent
            width, height = size
            items = (
                RasterMosaicItem.filter(
                    func.st_intersects(
                        func.st_transform(
                            func.st_makeenvelope(xmin, ymin, xmax, ymax, self.srs.id), 4326
                        ),
                        RasterMosaicItem.footprint,
                    ),
                    RasterMosaicItem.resource_id == self.id,
                )
                .order_by(RasterMosaicItem.position)
                .all()
            )

            if len(items) > 0:
                workdir_path = env.raster_mosaic.workdir_path
                ds = gdal.BuildVRT(
                    "",
                    [str(workdir_path(item.fileobj)) for item in items],
                    options=gdal.BuildVRTOptions(
                        xRes=(xmax - xmin) / width,
                        yRes=(ymax - ymin) / height,
                    ),
                )
                return ds

    @property
    def extent(self):
        footprint = sa.func.st_extent(RasterMosaicItem.footprint)
        extent = (
            DBSession.query(
                sa.func.st_xmin(footprint).label("minLon"),
                sa.func.st_xmax(footprint).label("maxLon"),
                sa.func.st_ymin(footprint).label("minLat"),
                sa.func.st_ymax(footprint).label("maxLat"),
            )
            .filter(RasterMosaicItem.resource_id == self.id)
            .one()
        )
        extent = dict(
            minLon=extent.minLon, maxLon=extent.maxLon, minLat=extent.minLat, maxLat=extent.maxLat
        )

        return extent


class RasterMosaicItem(Base):
    __tablename__ = "%s_item" % COMP_ID

    id = sa.Column(sa.Integer, primary_key=True)
    resource_id = sa.Column(sa.ForeignKey(RasterMosaic.id), nullable=False)
    display_name = sa.Column(sa.Unicode, nullable=True)
    fileobj_id = sa.Column(sa.ForeignKey(FileObj.id), nullable=True)
    footprint = sa.Column(ga.Geometry("POLYGON", srid=4326), nullable=True)
    position = sa.Column(sa.Integer, nullable=True)

    fileobj = orm.relationship(FileObj, lazy="joined")
    resource = orm.relationship(
        RasterMosaic,
        backref=orm.backref(
            "items",
            cascade="all, delete-orphan",
            order_by=position,
            collection_class=ordering_list("position"),
        ),
    )

    def load_file(self, filename):
        if isinstance(filename, Path):
            filename = str(filename)

        ds = gdal.Open(filename, gdal.GA_ReadOnly)
        if not ds:
            raise ValidationError(gettext("GDAL library was unable to open the file."))

        if ds.RasterCount not in (3, 4):
            raise ValidationError(gettext("Only RGB and RGBA rasters are supported."))

        dsdriver = ds.GetDriver()
        dsproj = ds.GetProjection()
        dsgtran = ds.GetGeoTransform()

        if dsdriver.ShortName not in SUPPORTED_DRIVERS:
            raise ValidationError(
                gettext(
                    "Raster has format '%(format)s', however only following formats are supported: %(all_formats)s."
                )
                % dict(format=dsdriver.ShortName, all_formats=", ".join(SUPPORTED_DRIVERS))
            )

        if not dsproj or not dsgtran:
            raise ValidationError(
                gettext("Raster files without projection info are not supported.")
            )

        data_type = None
        alpha_band = None
        has_nodata = None
        for bidx in range(1, ds.RasterCount + 1):
            band = ds.GetRasterBand(bidx)

            if data_type is None:
                data_type = band.DataType
            elif data_type != band.DataType:
                raise ValidationError(gettext("Complex data types are not supported."))

            if band.GetRasterColorInterpretation() == gdal.GCI_AlphaBand:
                assert alpha_band is None, "Multiple alpha bands found!"
                alpha_band = bidx
            else:
                has_nodata = (has_nodata is None or has_nodata) and (
                    band.GetNoDataValue() is not None
                )

        # treat the fourth band as alpha
        if ds.RasterCount == 4 and alpha_band is None:
            alpha_band = 4
            ds = gdal.Open(filename, gdal.GA_Update)
            ds.GetRasterBand(alpha_band).SetColorInterpretation(gdal.GCI_AlphaBand)
            ds = None

        src_osr = sr_from_wkt(dsproj)
        dst_osr = self.resource.srs.to_osr()

        reproject = not src_osr.IsSame(dst_osr)

        info = gdal.Info(filename, format="json")
        geom = Geometry.from_geojson(info["wgs84Extent"])
        self.footprint = ga.elements.WKBElement(bytearray(geom.wkb), srid=4326)
        self.fileobj = env.file_storage.fileobj(component="raster_mosaic")

        dst_file = env.raster_mosaic.workdir_path(self.fileobj, makedirs=True)
        co = ["COMPRESS=DEFLATE", "TILED=YES", "BIGTIFF=YES"]
        if reproject:
            gdal.Warp(
                str(dst_file),
                filename,
                options=gdal.WarpOptions(
                    format="GTiff",
                    dstSRS="EPSG:%d" % self.resource.srs.id,
                    dstAlpha=not has_nodata and alpha_band is None,
                    creationOptions=co,
                ),
            )
        else:
            gdal.Translate(
                str(dst_file),
                filename,
                options=gdal.TranslateOptions(format="GTiff", creationOptions=co),
            )

        self.build_overview()

    def build_overview(self, missing_only=False):
        fn = env.raster_mosaic.workdir_path(self.fileobj)
        if missing_only and fn.with_suffix(".ovr").exists():
            return

        # cleaning overviews
        ds = gdal.Open(str(fn), gdal.GA_Update)
        ds.BuildOverviews(overviewlist=[])
        ds = None

        # building overviews
        options = {
            "COMPRESS_OVERVIEW": "DEFLATE",
            "INTERLEAVE_OVERVIEW": "PIXEL",
            "BIGTIFF_OVERVIEW": "YES",
        }
        for key, val in options.items():
            gdal.SetConfigOption(key, val)
        try:
            ds = gdal.Open(str(fn), gdal.GA_ReadOnly)
            ds.BuildOverviews("GAUSS", overviewlist=calc_overviews_levels(ds))

            ds = None
        finally:
            for key, val in options.items():
                gdal.SetConfigOption(key, None)

    def to_dict(self):
        return dict(id=self.id, display_name=self.display_name)


class RasterMosaicItemRead(Struct, kw_only=True):
    id: int
    display_name: Union[str, None]


class RasterMosaicItemWrite(Struct, kw_only=True):
    id: Union[int, UnsetType] = UNSET
    display_name: Union[str, None, UnsetType] = UNSET
    file_upload: Union[FileUploadRef, UnsetType] = UNSET


class ItemsAttr(SAttribute):
    def get(self, srlzr: Serializer) -> List[RasterMosaicItemRead]:
        return [
            RasterMosaicItemRead(
                id=i.id,
                display_name=i.display_name,
            )
            for i in srlzr.obj.items
        ]

    def set(self, srlzr: Serializer, value: List[RasterMosaicItemWrite], *, create: bool):
        srlzr.obj.items = []
        for item in value:
            if (file_upload := item.file_upload) is not UNSET:
                dn = item.display_name if item.display_name is not UNSET else None
                mitem = RasterMosaicItem(resource=srlzr.obj, display_name=dn)
                mitem.load_file(file_upload().data_path)
            else:
                mitem = RasterMosaicItem.filter_by(id=item.id).one()
                if mitem.resource_id == srlzr.obj.id:
                    if (dn := item.display_name) is not UNSET:
                        mitem.display_name = dn
            srlzr.obj.items.append(mitem)


class RasterMosaicSerializer(Serializer, resource=RasterMosaic):
    srs = SRelationship(read=ResourceScope.read, write=ResourceScope.update)
    items = ItemsAttr(read=DataScope.read, write=DataScope.write)
