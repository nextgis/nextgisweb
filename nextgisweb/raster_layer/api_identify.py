from typing import Annotated, Any

from msgspec import Struct

from nextgisweb.env import DBSession
from nextgisweb.lib.apitype import Query

from nextgisweb.resource import DataScope

from .model import COLOR_INTERPRETATION, RasterLayer
from .val_at_coord import OutOfExetentException, val_at_coord


class Point(Struct, kw_only=True):
    lon: float
    lat: float


class IdentifyLayer(Struct, kw_only=True):
    id: int
    color_interpretation: list[str]
    values: list[Any]


class IdentifyResponse(Struct, kw_only=True):
    point: Point
    layers: list[IdentifyLayer]


def identify(
    request, *, point: Annotated[Point, Query(spread=True)], layers: list[int]
) -> IdentifyResponse:
    """Returns the values at a specific point for the provided list of layers"""

    query = DBSession.query(RasterLayer).filter(RasterLayer.id.in_(layers))

    identified_layers = []
    for layer in query:
        if layer.has_permission(DataScope.read, request.user):
            ds = layer.gdal_dataset()
            try:
                values = val_at_coord(
                    ds=ds,
                    longitude=point.lon,
                    latitude=point.lat,
                    coordtype_georef=True,
                    print_xy=False,
                    print_values=False,
                )
            except OutOfExetentException:
                continue

            color_interpretation = [
                COLOR_INTERPRETATION[ds.GetRasterBand(bidx).GetRasterColorInterpretation()]
                for bidx in range(1, layer.band_count + 1)
            ]
            identified_layer = IdentifyLayer(
                id=layer.id,
                color_interpretation=color_interpretation,
                values=values.flatten().tolist(),
            )
            identified_layers.append(identified_layer)

    return IdentifyResponse(point=point, layers=identified_layers)


def setup_pyramid(comp, config):
    config.add_route(
        "raster_layer.identify",
        "/api/raster_layer/identify",
        get=identify,
    )
