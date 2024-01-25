from pyramid.httpexceptions import HTTPNotFound

from nextgisweb.pyramid import JSONType
from nextgisweb.resource import DataScope, resource_factory

from .interface import IBboxLayer


def extent(resource, request) -> JSONType:
    impl = resource.lookup_interface(IBboxLayer)
    if impl is None:
        return HTTPNotFound()

    request.resource_permission(DataScope.read, impl)
    return dict(extent=impl.extent)


def setup_pyramid(comp, config):
    config.add_route(
        "layer.extent",
        "/api/resource/{id}/extent",
        factory=resource_factory,
        get=extent,
    )
