from typing import List, Tuple

from msgspec import Meta, Struct
from typing_extensions import Annotated

from nextgisweb.resource import ConnectionScope, ResourceFactory

from .model import WFSConnection

Lat = Annotated[float, Meta(ge=-90, le=90)]
Lon = Annotated[float, Meta(ge=-180, le=180)]


class LayerObject(Struct, kw_only=True):
    name: str
    srid: int
    bbox: Tuple[Lon, Lat, Lon, Lat]


class InspectResponse(Struct, kw_only=True):
    version: str
    layers: List[LayerObject]


def inspect_connection(resource, request) -> InspectResponse:
    request.resource_permission(ConnectionScope.connect)

    return resource.get_capabilities()


class FieldObject(Struct, kw_only=True):
    name: str
    type: Tuple[str, str]


class InspectLayerResponse(Struct, kw_only=True):
    fields: List[FieldObject]


def inspect_layer(resource, request) -> InspectLayerResponse:
    request.resource_permission(ConnectionScope.connect)

    layer_name = request.matchdict["layer"]
    fields = resource.get_fields(layer_name)

    return InspectLayerResponse(fields=fields)


def setup_pyramid(comp, config):
    wfsconnection_factory = ResourceFactory(context=WFSConnection)

    config.add_route(
        "wfsclient.connection.inspect",
        "/api/resource/{id}/wfsclient/inspect",
        factory=wfsconnection_factory,
        get=inspect_connection,
    )

    config.add_route(
        "wfsclient.connection.inspect.layer",
        "/api/resource/{id}/wfsclient/inspect/{layer:str}",
        factory=wfsconnection_factory,
        get=inspect_layer,
    )
