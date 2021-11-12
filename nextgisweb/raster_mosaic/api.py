from pyramid.response import FileResponse
from sqlalchemy.orm.exc import NoResultFound

from ..core.exception import ValidationError
from ..env import env
from ..resource import DataScope

from .model import RasterMosaic, RasterMosaicItem
from .util import _


def export(resource, request):
    request.resource_permission(DataScope.read)

    item_id = request.GET.get("item_id")

    if item_id is None:
        raise ValidationError(_("Raster mosaic item id not provided."))

    try:
        item_id = int(item_id)
        item = RasterMosaicItem.filter_by(id=item_id, resource_id=resource.id).one()
    except NoResultFound:
        raise ValidationError(_("Raster mosaic item not found."))

    fn = env.file_storage.filename(item.fileobj)

    response = FileResponse(fn, request=request)
    response.content_disposition = "attachment; filename=%d_%d.tif" % (
        resource.id,
        item_id,
    )

    return response


def setup_pyramid(comp, config):
    config.add_view(
        export, route_name="resource.export", context=RasterMosaic, request_method="GET"
    )
