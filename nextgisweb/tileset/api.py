from typing import Annotated

from nextgisweb.lib.apitype import ContentType

from nextgisweb.pyramid.tomb import Configurator, FileResponse, Request, Response
from nextgisweb.resource import DataScope

from .component import TilesetComponent
from .model import Tileset


def export(
    resource: Tileset,
    request: Request,
) -> Annotated[Response, ContentType("application/vnd.sqlite3")]:
    """Export tileset in internal representation format

    :returns: Tileset exported as an SQLite database"""
    request.resource_permission(DataScope.read)

    response = FileResponse(
        resource.fileobj.filename(),
        content_type="application/vnd.sqlite3",
        request=request,
    )
    response.content_disposition = f"attachment; filename={resource.id}.ngwtiles"
    return response


def setup_pyramid(comp: TilesetComponent, config: Configurator):
    config.add_view(
        export,
        route_name="resource.export",
        context=Tileset,
        request_method="GET",
    )
