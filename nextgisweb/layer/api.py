from msgspec import Struct
from pyramid.httpexceptions import HTTPNotFound

from nextgisweb.feature_layer.api import NgwExtent
from nextgisweb.pyramid.tomb import Request
from nextgisweb.resource import DataScope, resource_factory

from .component import LayerComponent
from .interface import IBboxLayer


class Extent(Struct):
    extent: NgwExtent


def extent(resource, request: Request) -> Extent:
    """Get resource geographic extent

    :returns: Geographic extent of the resource"""
    impl = resource.lookup_interface(IBboxLayer)
    if impl is None:
        raise HTTPNotFound()

    request.resource_permission(DataScope.read, impl)
    return Extent(extent=impl.extent)


def setup_pyramid(comp: LayerComponent, config):
    config.add_route(
        "layer.extent",
        "/api/resource/{id}/extent",
        factory=resource_factory,
        get=extent,
    )
