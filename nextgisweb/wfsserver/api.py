from pyramid.response import Response

from nextgisweb.core.exception import InsufficientPermissions
from nextgisweb.resource import ResourceFactory, ServiceScope

from .model import Service
from .wfs_handler import WFSHandler


def wfs(resource, request):
    """WFS endpoint"""
    try:
        request.resource_permission(ServiceScope.connect)
    except InsufficientPermissions:
        if request.authenticated_userid is None:
            # Force 401 Unauthorized for unauthenticated users. It's useful for
            # MapInfo because there is no way to give user credentials directly
            # there.

            # TODO: Maybe it should be implemented in the error handler with an
            # additional option to enable this behavior.

            return Response(status_code=401, headers={"WWW-Authenticate": "Basic"})
        else:
            raise

    fsv = request.env.wfsserver._force_schema_validation
    xml = WFSHandler(
        resource,
        request,
        force_schema_validation=fsv,
    ).response()
    return Response(xml, content_type="text/xml", charset="utf-8")


def error_renderer(request, err_info, exc, exc_info, debug=True):
    tr = request.translate
    xml = WFSHandler.exception_response(
        request,
        tr(v) if (v := exc.title) else None,
        tr(v) if (v := exc.message) else None,
    )

    return Response(
        xml,
        content_type="application/xml",
        charset="utf-8",
        status_code=exc.http_status_code,
    )


def setup_pyramid(comp, config):
    service_factory = ResourceFactory(context=Service)

    config.add_route(
        "wfsserver.wfs",
        "/api/resource/{id}/wfs",
        factory=service_factory,
        error_renderer=error_renderer,
        get=wfs,
        post=wfs,
    )
