from typing import Annotated, Any

from msgspec import Struct
from osgeo import gdal

from nextgisweb.env import DBSession
from nextgisweb.lib.apitype import Query

from nextgisweb.resource import DataScope, ResourceRef

from .model import COLOR_INTERPRETATION, RasterLayer


class Point(Struct, kw_only=True):
    x: float
    y: float


class RasterLayerIdentifyItem(Struct, kw_only=True):
    resource: ResourceRef
    color_interpretation: list[str]
    pixel_class: list[str]
    values: list[Any]


class RasterLayerIdentifyResponse(Struct, kw_only=True):
    items: list[RasterLayerIdentifyItem]


def identify(
    request,
    *,
    resources: list[int],
    point: Annotated[Point, Query(spread=True)],
) -> RasterLayerIdentifyResponse:
    """Get raster values at specific point for list of resources"""

    query = DBSession.query(RasterLayer).filter(RasterLayer.id.in_(resources))

    items: list[RasterLayerIdentifyItem] = []
    for res in query:
        if res.has_permission(DataScope.read, request.user):
            ds = res.gdal_dataset()
            if (values := val_at_coord(ds, point)) is None:
                continue

            color_interpretation = []
            pixel_class = []

            for bidx in range(1, res.band_count + 1):
                band = ds.GetRasterBand(bidx)
                color_interpretation.append(
                    COLOR_INTERPRETATION[band.GetRasterColorInterpretation()]
                )

                rat = band.GetDefaultRAT()
                if (rat) is not None and rat.GetTableType() == gdal.GRTT_THEMATIC:
                    rat_col = rat.GetColOfUsage(gdal.GFU_Name)
                    rat_row = rat.GetRowOfValue(values[bidx - 1].item())
                    if rat_col == -1 or rat_row == -1:
                        pixel_class.append(None)
                        continue
                    pixel_class_value = rat.GetValueAsString(rat_row, rat_col)
                    pixel_class.append(pixel_class_value)
                else:
                    pixel_class.append(None)

            items.append(
                RasterLayerIdentifyItem(
                    resource=ResourceRef(id=res.id),
                    color_interpretation=color_interpretation,
                    pixel_class=pixel_class,
                    values=values.flatten().tolist(),
                )
            )

    return RasterLayerIdentifyResponse(items=items)


def val_at_coord(ds: gdal.Dataset, point: Point):
    """Simplified version of gdallocationinfo with less options. Borrowed from
    https://github.com/OSGeo/gdal/blob/master/swig/python/gdal-utils/osgeo_utils/samples/gdallocationinfo.py
    """

    # Read geotransform matrix and calculate corresponding pixel coordinates
    geotransform = ds.GetGeoTransform()
    inv_geotransform = gdal.InvGeoTransform(geotransform)
    i = int(inv_geotransform[0] + inv_geotransform[1] * point.x + inv_geotransform[2] * point.y)
    j = int(inv_geotransform[3] + inv_geotransform[4] * point.x + inv_geotransform[5] * point.y)

    if i < 0 or i >= ds.RasterXSize or j < 0 or j >= ds.RasterYSize:
        return None

    result = ds.ReadAsArray(i, j, 1, 1)
    return result


def setup_pyramid(comp, config):
    config.add_route(
        "raster_layer.identify",
        "/api/component/raster_layer/identify",
        get=identify,
    )
