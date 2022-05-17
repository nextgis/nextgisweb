import os.path
import geoalchemy2 as ga
from sqlalchemy import func
from sqlalchemy.ext.orderinglist import ordering_list
from osgeo import gdal, osr
from zope.interface import implementer

from .. import db
from ..core.exception import ValidationError
from ..env import env
from ..lib.geometry import Geometry
from ..models import declarative_base, DBSession
from ..resource import (
    DataScope,
    DataStructureScope,
    ResourceScope,
    Resource,
    ResourceGroup,
    Serializer,
    SerializedRelationship as SR,
    SerializedProperty as SP)
from ..raster_layer.util import calc_overviews_levels
from ..file_storage import FileObj
from ..layer import SpatialLayerMixin, IBboxLayer
from .util import _, COMP_ID

Base = declarative_base()

SUPPORTED_DRIVERS = ('GTiff', )


@implementer(IBboxLayer)
class RasterMosaic(Base, Resource, SpatialLayerMixin):
    identity = 'raster_mosaic'
    cls_display_name = _("Raster mosaic")

    __scope__ = (DataStructureScope, DataScope)

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

            fnames = []
            for item in items:
                fname = env.raster_mosaic.workdir_filename(item.fileobj)
                fnames.append(fname)

            if len(fnames) > 0:
                ds = gdal.BuildVRT(
                    "",
                    fnames,
                    options=gdal.BuildVRTOptions(
                        xRes=(xmax - xmin) / width,
                        yRes=(ymax - ymin) / height,
                    )
                )
                return ds

    @property
    def extent(self):
        footprint = db.func.st_extent(RasterMosaicItem.footprint)
        extent = (
            DBSession.query(
                db.func.st_xmin(footprint).label('minLon'),
                db.func.st_xmax(footprint).label('maxLon'),
                db.func.st_ymin(footprint).label('minLat'),
                db.func.st_ymax(footprint).label('maxLat'),
            )
            .filter(RasterMosaicItem.resource_id == self.id)
            .one()
        )
        extent = dict(
            minLon=extent.minLon,
            maxLon=extent.maxLon,
            minLat=extent.minLat,
            maxLat=extent.maxLat
        )

        return extent


class RasterMosaicItem(Base):
    __tablename__ = '%s_item' % COMP_ID

    id = db.Column(db.Integer, primary_key=True)
    resource_id = db.Column(db.ForeignKey(RasterMosaic.id), nullable=False)
    display_name = db.Column(db.Unicode, nullable=True)
    fileobj_id = db.Column(db.ForeignKey(FileObj.id), nullable=True)
    footprint = db.Column(ga.Geometry('POLYGON', srid=4326), nullable=True)
    position = db.Column(db.Integer, nullable=True)

    fileobj = db.relationship(FileObj, lazy='joined')
    resource = db.relationship(
        RasterMosaic,
        backref=db.backref(
            'items',
            cascade='all, delete-orphan',
            order_by=position,
            collection_class=ordering_list('position'),
        ),
    )

    def load_file(self, filename, env):
        ds = gdal.Open(filename, gdal.GA_ReadOnly)
        if not ds:
            raise ValidationError(_("GDAL library was unable to open the file."))

        if ds.RasterCount not in (3, 4):
            raise ValidationError(_("Only RGB and RGBA rasters are supported."))

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

        data_type = None
        alpha_band = None
        has_nodata = None
        for bidx in range(1, ds.RasterCount + 1):
            band = ds.GetRasterBand(bidx)

            if data_type is None:
                data_type = band.DataType
            elif data_type != band.DataType:
                raise ValidationError(_("Complex data types are not supported."))

            if band.GetRasterColorInterpretation() == gdal.GCI_AlphaBand:
                assert alpha_band is None, "Multiple alpha bands found!"
                alpha_band = bidx
            else:
                has_nodata = (has_nodata is None or has_nodata) and (
                    band.GetNoDataValue() is not None)

        src_osr = osr.SpatialReference()
        src_osr.ImportFromWkt(dsproj)
        dst_osr = self.resource.srs.to_osr()

        reproject = not src_osr.IsSame(dst_osr)

        info = gdal.Info(filename, format='json')
        geom = Geometry.from_geojson(info['wgs84Extent'])
        self.footprint = ga.elements.WKBElement(bytearray(geom.wkb), srid=4326)
        self.fileobj = env.file_storage.fileobj(component='raster_mosaic')

        dst_file = env.raster_mosaic.workdir_filename(self.fileobj, makedirs=True)
        co = ['COMPRESS=DEFLATE', 'TILED=YES', 'BIGTIFF=YES']
        if reproject:
            gdal.Warp(
                dst_file,
                filename,
                options=gdal.WarpOptions(
                    format='GTiff',
                    dstSRS='EPSG:%d' % self.resource.srs.id,
                    dstAlpha=not has_nodata and alpha_band is None,
                    creationOptions=co,
                ),
            )
        else:
            gdal.Translate(
                dst_file,
                filename,
                options=gdal.TranslateOptions(
                    format='GTiff',
                    creationOptions=co
                )
            )

        self.build_overview()

    def build_overview(self, missing_only=False):
        fn = env.raster_mosaic.workdir_filename(self.fileobj)
        if missing_only and os.path.isfile(fn + '.ovr'):
            return

        # cleaning overviews
        ds = gdal.Open(fn, gdal.GA_Update)
        ds.BuildOverviews(overviewlist=[])
        ds = None

        # building overviews
        options = {
            'COMPRESS_OVERVIEW': 'DEFLATE',
            'INTERLEAVE_OVERVIEW': 'PIXEL',
            'BIGTIFF_OVERVIEW': 'YES',
        }
        for key, val in options.items():
            gdal.SetConfigOption(key, val)
        try:
            ds = gdal.Open(fn, gdal.GA_ReadOnly)
            ds.BuildOverviews('GAUSS', overviewlist=calc_overviews_levels(ds))

            ds = None
        finally:
            for key, val in options.items():
                gdal.SetConfigOption(key, None)

    def to_dict(self):
        return dict(id=self.id, display_name=self.display_name)


class _items_attr(SP):

    def getter(self, srlzr):
        return [itm.to_dict() for itm in srlzr.obj.items]

    def setter(self, srlzr, value):
        srlzr.obj.items = []
        for item in value:
            file_upload = item.get('file_upload')
            if file_upload is not None:
                mitem = RasterMosaicItem(resource=srlzr.obj, display_name=item['display_name'])
                srcfile, _ = env.file_upload.get_filename(file_upload['id'])
                mitem.load_file(srcfile, env)
            else:
                mitem = RasterMosaicItem.filter_by(id=item['id']).one()
                if mitem.resource_id == srlzr.obj.id:
                    mitem.display_name = item['display_name']
            srlzr.obj.items.append(mitem)


P_DSS_READ = DataStructureScope.read
P_DSS_WRITE = DataStructureScope.write
P_DS_READ = DataScope.read
P_DS_WRITE = DataScope.write
P_RS_READ = ResourceScope.read
P_RS_UPDATE = ResourceScope.update


class RasterMosaicSerializer(Serializer):
    identity = RasterMosaic.identity
    resclass = RasterMosaic

    srs = SR(read=P_DSS_READ, write=P_DSS_WRITE)

    items = _items_attr(
        read=P_DS_READ,
        write=P_DS_WRITE
    )
