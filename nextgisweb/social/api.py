from pyramid.httpexceptions import HTTPNotFound
from pyramid.response import FileResponse

from ..env import env
from ..resource import resource_factory


def preview(resource, request):
    if resource.social is None or resource.social.preview_fileobj is None:
        raise HTTPNotFound()

    path = env.file_storage.filename(resource.social.preview_fileobj)
    return FileResponse(path, content_type='image/png', request=request)


def setup_pyramid(comp, config):
    config.add_route(
        'resource.preview', '/api/resource/{id}/preview.png',
        factory=resource_factory
    ).add_view(preview, request_method='GET')
