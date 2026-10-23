from typing import Annotated

from msgspec import UNSET, Meta, UnsetType
from shapely.geometry import box
from sqlalchemy.exc import NoResultFound

from nextgisweb.env import gettextf
from nextgisweb.lib.apitype import AnyOf, ContentType, StatusCode
from nextgisweb.lib.geometry import Geometry

from nextgisweb.core.exception import ValidationError
from nextgisweb.pyramid.tomb import Configurator, HTTPNoContent, HTTPNotFound, Request, Response
from nextgisweb.render.api import TileX, TileY, TileZ
from nextgisweb.resource import DataScope, Resource
from nextgisweb.resource.exception import ResourceNotFound
from nextgisweb.spatial_ref_sys import SRS

from .component import FeatureLayerComponent
from .interface import GEOM_TYPE, IFeatureQueryClipByBox, IFeatureQuerySimplify
from .model import FeatureLayerMixin
from .mvt_native import encode_tile, mvt_features





def mvt(
    request: Request,
    *,
    resource: Annotated[list[int], Meta(min_length=1)],
    z: TileZ,
    x: TileX,
    y: TileY,
    extent: int = 4096,
    simplification: float | UnsetType = UNSET,
    padding: Annotated[float, Meta(ge=0, le=0.5)] = 0.05,
) -> AnyOf[
    Annotated[None, ContentType("application/vnd.mapbox-vector-tile")],
    Annotated[None, StatusCode(204)],
]:
    """Get MVT tile for one or more resources

    :returns: Mapbox Vector Tile binary data"""

    if simplification is UNSET:
        simplification = extent / 512

    # web mercator
    merc = SRS.filter_by(id=3857).one()
    tile_bbox = merc.tile_extent((z, x, y))
    minx, miny, maxx, maxy = tile_bbox

    bbox = (
        minx - (maxx - minx) * padding,
        miny - (maxy - miny) * padding,
        maxx + (maxx - minx) * padding,
        maxy + (maxy - miny) * padding,
    )
    bbox = Geometry.from_shape(box(*bbox), srid=merc.id)

    layers = []
    for resid in resource:
        try:
            obj = Resource.filter_by(id=resid).one()
        except NoResultFound:
            raise ResourceNotFound(resid)

        if not isinstance(obj, FeatureLayerMixin):
            raise ValidationError("Resource (ID=%d) is not a feature layer." % resid)

        request.resource_permission(DataScope.read, obj)

        if obj.geometry_type == GEOM_TYPE.NONE:
            raise ValidationError(
                gettextf("Resource (ID={}) has no geometry, MVT tiles are not available.")(resid)
            )

        query = obj.feature_query()
        query.intersects(bbox)
        query.geom()

        if IFeatureQueryClipByBox.providedBy(query):
            query.clip_by_box(bbox)

        if IFeatureQuerySimplify.providedBy(query):
            tolerance = ((obj.srs.maxx - obj.srs.minx) / (1 << z)) / extent
            query.simplify(tolerance * simplification)

        layers.append((obj, query))

    content = mvt_encode(layers, merc, tile_bbox, extent, padding)

    if not content:
        raise HTTPNoContent()

    # ty: ignore[invalid-return-type]
    return Response(content, content_type="application/vnd.mapbox-vector-tile")


def mvt_encode(layers, merc, tile_bbox, extent, padding):
    from ngw_mvt import encode_tile

    mvt_layers = []
    for obj, query in layers:
        # Native encoder expects geometries in EPSG:3857 as WKB
        query.srs(merc)
        query.geom_format("WKB")
        mvt_layers.append((f"ngw:{obj.id}", mvt_features(obj, query())))

    # Features are already clipped by the padded bbox, so the buffer only
    # needs to cover the padding. It must be less than a half of the extent.
    buffer = max(min(round(extent * padding), extent // 2 - 1), 0)

    return encode_tile(mvt_layers, extent, tile_bbox, buffer=buffer)


def setup_pyramid(comp: FeatureLayerComponent, config: Configurator):
    config.add_route(
        "feature_layer.mvt",
        "/api/component/feature_layer/mvt",
        get=mvt,
    )
