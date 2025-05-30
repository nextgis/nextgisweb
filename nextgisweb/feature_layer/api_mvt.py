from packaging import version
from typing import Annotated, List, Union
from uuid import uuid4

from msgspec import UNSET, Meta, UnsetType
from osgeo import gdal, ogr
from pyramid.httpexceptions import HTTPNoContent, HTTPNotFound
from pyramid.response import Response
from shapely.geometry import box
from sqlalchemy.orm.exc import NoResultFound

from nextgisweb.lib.apitype import AnyOf, ContentType, StatusCode
from nextgisweb.lib.geometry import Geometry

from nextgisweb.core.exception import ValidationError
from nextgisweb.feature_layer import IFeatureLayer
from nextgisweb.render.api import TileX, TileY, TileZ
from nextgisweb.resource import DataScope, Resource
from nextgisweb.resource.exception import ResourceNotFound
from nextgisweb.spatial_ref_sys import SRS

from .api_export import _ogr_layer_from_features
from .interface import IFeatureQueryClipByBox, IFeatureQuerySimplify
from .ogrdriver import MVT_DRIVER_EXIST


def _ogr_ds(driver, options):
    return ogr.GetDriverByName(driver).CreateDataSource(
        "/vsimem/%s" % uuid4(),
        options=options,
    )


# Prior to GDAL 3.5.0 we need to manually make geometries valid. See
# https://github.com/OSGeo/gdal/commit/f286e04ef98bba45666ba2c2dae26ad8bad4729b
MAKE_VALID = version.parse(gdal.__version__.split("-")[0]) < version.parse("3.5.0")


def mvt(
    request,
    *,
    resource: Annotated[List[int], Meta(min_length=1)],
    z: TileZ,
    x: TileX,
    y: TileY,
    extent: int = 4096,
    simplification: Union[float, UnsetType] = UNSET,
    padding: Annotated[float, Meta(ge=0, le=0.5)] = 0.05,
) -> AnyOf[
    Annotated[None, ContentType("application/vnd.mapbox-vector-tile")],
    Annotated[None, StatusCode(204)],
]:
    """Get MVT tile for one or more resources"""
    if not MVT_DRIVER_EXIST:
        return HTTPNotFound(explanation="MVT GDAL driver not found")

    if simplification is UNSET:
        simplification = extent / 512

    # web mercator
    merc = SRS.filter_by(id=3857).one()
    minx, miny, maxx, maxy = merc.tile_extent((z, x, y))

    bbox = (
        minx - (maxx - minx) * padding,
        miny - (maxy - miny) * padding,
        maxx + (maxx - minx) * padding,
        maxy + (maxy - miny) * padding,
    )
    bbox = Geometry.from_shape(box(*bbox), srid=merc.id)

    options = [
        "FORMAT=DIRECTORY",
        "TILE_EXTENSION=pbf",
        "MINZOOM=%d" % z,
        "MAXZOOM=%d" % z,
        "EXTENT=%d" % extent,
        "COMPRESS=NO",
    ]

    ds = _ogr_ds("MVT", options)

    vsibuf = ds.GetName()

    for resid in resource:
        try:
            obj = Resource.filter_by(id=resid).one()
        except NoResultFound:
            raise ResourceNotFound(resid)

        if not IFeatureLayer.providedBy(obj):
            raise ValidationError("Resource (ID=%d) is not a feature layer." % resid)

        request.resource_permission(DataScope.read, obj)

        query = obj.feature_query()
        query.intersects(bbox)
        query.geom()

        if IFeatureQueryClipByBox.providedBy(query):
            query.clip_by_box(bbox)

        if IFeatureQuerySimplify.providedBy(query):
            tolerance = ((obj.srs.maxx - obj.srs.minx) / (1 << z)) / extent
            query.simplify(tolerance * simplification)

        _ogr_layer_from_features(obj, query(), name=f"ngw:{obj.id}", ds=ds, make_valid=MAKE_VALID)

    # Flush changes
    ds = None

    try:
        f = gdal.VSIFOpenL(f"{vsibuf}/{z}/{x}/{y}.pbf", "rb")
        if f is not None:
            # SEEK_END = 2
            gdal.VSIFSeekL(f, 0, 2)
            size = gdal.VSIFTellL(f)

            # SEEK_SET = 0
            gdal.VSIFSeekL(f, 0, 0)
            content = bytes(gdal.VSIFReadL(1, size, f))
            gdal.VSIFCloseL(f)

            return Response(
                content,
                content_type="application/vnd.mapbox-vector-tile",
            )
        else:
            return HTTPNoContent()

    finally:
        gdal.Unlink(vsibuf)


def setup_pyramid(comp, config):
    config.add_route(
        "feature_layer.mvt",
        "/api/component/feature_layer/mvt",
        get=mvt,
    )
