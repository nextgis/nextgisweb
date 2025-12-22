from typing import Annotated

import requests
from msgspec import Meta, Struct
from requests.exceptions import RequestException

from nextgisweb.core.exception import ExternalServiceError
from nextgisweb.resource import ConnectionScope, ResourceFactory

from .model import NEXTGIS_GEOSERVICES, Connection

Zoom = Annotated[int, Meta(ge=0, le=30)]
Lat = Annotated[float, Meta(ge=-90, le=90)]
Lon = Annotated[float, Meta(ge=-180, le=180)]


class LayerObject(Struct, kw_only=True):
    layer: str
    description: str
    tilesize: Annotated[int, Meta(ge=1)]
    minzoom: Zoom
    maxzoom: Zoom
    bounds: tuple[Lon, Lat, Lon, Lat]


class InspectResponse(Struct, kw_only=True):
    layers: list[LayerObject]


def inspect_connection(resource, request) -> InspectResponse:
    request.resource_permission(ConnectionScope.connect)

    layers = []

    if resource.capmode == NEXTGIS_GEOSERVICES:
        try:
            result = requests.get(
                request.env.tmsclient.options["nextgis_geoservices.layers"],
                headers=request.env.tmsclient.headers,
                timeout=request.env.tmsclient.options["timeout"].total_seconds(),
            )
            result.raise_for_status()
        except RequestException:
            raise ExternalServiceError()

        for layer in result.json():
            layers.append(
                LayerObject(
                    layer=layer["layer"],
                    description=layer["description"],
                    tilesize=layer["tile_size"],
                    minzoom=layer["min_zoom"],
                    maxzoom=layer["max_zoom"],
                    bounds=layer["bounds"],
                )
            )

    return InspectResponse(layers=layers)


def setup_pyramid(comp, config):
    config.add_route(
        "tmsclient.connection.inspect",
        "/api/resource/{id}/tmsclient/inspect",
        factory=ResourceFactory(context=Connection),
        get=inspect_connection,
    )
