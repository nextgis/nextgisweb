from typing import Annotated

from pyramid.response import FileResponse
from sqlalchemy.exc import NoResultFound

from nextgisweb.env import gettext
from nextgisweb.lib.apitype import ContentType

from nextgisweb.core.exception import ValidationError
from nextgisweb.resource import DataScope

from .model import RasterMosaic, RasterMosaicItem


def export(
    resource,
    request,
) -> Annotated[FileResponse, ContentType("image/tiff; application=geotiff")]:
    """Export raster mosaic item

    :returns: Raster mosaic item exported as a GeoTIFF file"""
    request.resource_permission(DataScope.read)

    item_id = request.GET.get("item_id")

    if item_id is None:
        raise ValidationError(gettext("Raster mosaic item id not provided."))

    try:
        item_id = int(item_id)
        item = RasterMosaicItem.filter_by(id=item_id, resource_id=resource.id).one()
    except NoResultFound:
        raise ValidationError(gettext("Raster mosaic item not found."))

    response = FileResponse(item.fileobj.filename(), request=request)
    response.content_disposition = "attachment; filename=%d_%d.tif" % (
        resource.id,
        item_id,
    )

    return response


def setup_pyramid(comp, config):
    config.add_view(
        export,
        route_name="resource.export",
        context=RasterMosaic,
        request_method="GET",
    )
