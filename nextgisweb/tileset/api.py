from pyramid.response import FileResponse, Response
from typing_extensions import Annotated

from nextgisweb.lib.apitype import ContentType

from nextgisweb.resource import DataScope

from .model import Tileset


def export(
    resource: Tileset,
    request,
) -> Annotated[Response, ContentType("application/vnd.sqlite3")]:
    """Export tileset in internal representation format"""
    request.resource_permission(DataScope.read)

    response = FileResponse(
        resource.fileobj.filename(),
        content_type="application/vnd.sqlite3",
        request=request,
    )
    response.content_disposition = f"attachment; filename={resource.id}.ngwtiles"
    return response


def setup_pyramid(comp, config):
    config.add_view(
        export,
        route_name="resource.export",
        context=Tileset,
        request_method="GET",
    )
