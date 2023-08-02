from pyramid.response import FileResponse

from nextgisweb.env import env

from nextgisweb.resource import DataScope

from .model import Tileset


def export(resource, request):
    request.resource_permission(DataScope.read)

    fn = env.file_storage.filename(resource.fileobj)
    response = FileResponse(fn, content_type='application/vnd.sqlite3')
    response.content_disposition = f'attachment; filename={resource.id}.ngwtiles'
    return response


def setup_pyramid(comp, config):
    config.add_view(
        export, route_name='resource.export', context=Tileset, request_method='GET')
