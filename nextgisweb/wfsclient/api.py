from nextgisweb.pyramid import JSONType
from nextgisweb.resource import ConnectionScope, resource_factory

from .model import WFSConnection


def inspect_connection(resource, request) -> JSONType:
    request.resource_permission(ConnectionScope.connect)

    capabilities = resource.get_capabilities()

    return capabilities["layers"]


def inspect_layer(resource, request) -> JSONType:
    request.resource_permission(ConnectionScope.connect)

    layer_name = request.matchdict["layer"]
    fields = resource.get_fields(layer_name)

    return fields


def setup_pyramid(comp, config):
    config.add_route(
        "wfsclient.connection.inspect",
        "/api/resource/{id:uint}/wfs_connection/inspect/",
        factory=resource_factory,
    ).get(inspect_connection, context=WFSConnection)

    config.add_route(
        "wfsclient.connection.inspect.layer",
        "/api/resource/{id:uint}/wfs_connection/inspect/{layer:str}/",
        factory=resource_factory,
    ).add_view(inspect_layer, context=WFSConnection, request_method="GET")
