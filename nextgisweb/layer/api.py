from msgspec import Struct
from pyramid.httpexceptions import HTTPNotFound

from nextgisweb.feature_layer.api import NgwExtent
from nextgisweb.resource import DataScope, resource_factory

from .interface import IBboxLayer


class Extent(Struct):
    extent: NgwExtent


def extent(resource, request) -> Extent:
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
