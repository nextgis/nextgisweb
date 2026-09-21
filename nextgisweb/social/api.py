from nextgisweb.pyramid.tomb import Configurator, FileResponse, HTTPNotFound, Request
from nextgisweb.resource import resource_factory

from .component import SocialComponent


def preview(resource, request: Request):
    if resource.social is None or resource.social.preview_fileobj is None:
        raise HTTPNotFound()

    fn = resource.social.preview_fileobj.filename()
    return FileResponse(fn, content_type="image/png", request=request)


def setup_pyramid(comp: SocialComponent, config: Configurator):
    config.add_route(
        "resource.preview",
        "/api/resource/{id}/preview.png",
        factory=resource_factory,
        get=preview,
    )
