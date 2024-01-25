from nextgisweb.pyramid import JSONType
from nextgisweb.resource import ConnectionScope, ResourceFactory

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
    wfsconnection_factory = ResourceFactory(context=WFSConnection)

    config.add_route(
        "wfsclient.connection.inspect",
        "/api/resource/{id}/wfs_connection/inspect/",
        factory=wfsconnection_factory,
        get=inspect_connection,
    )

    config.add_route(
        "wfsclient.connection.inspect.layer",
        "/api/resource/{id}/wfs_connection/inspect/{layer:str}/",
        factory=wfsconnection_factory,
        get=inspect_layer,
    )
