from pyramid.response import FileResponse

from nextgisweb.resource import DataScope

from .model import Tileset


def export(resource: Tileset, request):
    """Download tileset in internal representation format"""

    request.resource_permission(DataScope.read)

    response = FileResponse(resource.fileobj.filename(), content_type="application/vnd.sqlite3")
    response.content_disposition = f"attachment; filename={resource.id}.ngwtiles"
    return response


def setup_pyramid(comp, config):
    config.add_view(
        export,
        route_name="resource.export",
        context=Tileset,
        request_method="GET",
    )
