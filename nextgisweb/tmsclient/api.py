from typing import Annotated

import requests
from msgspec import Meta, Struct
from requests.exceptions import HTTPError, JSONDecodeError, RequestException

from nextgisweb.env import gettext, gettextf
from nextgisweb.lib.logging import logger
from nextgisweb.lib.reqext import response_diagnostics

from nextgisweb.core.exception import ExternalServiceError
from nextgisweb.pyramid.tomb import Request
from nextgisweb.resource import ConnectionScope, ResourceFactory
from nextgisweb.tmsclient.component import TMSClientComponent

from .model import NEXTGIS_GEOSERVICES, TMSConnection

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


def inspect_connection(resource, request: Request) -> InspectResponse:
    """Inspect TMS client connection

    :returns: TMS client layer inspection result"""
    request.resource_permission(ConnectionScope.connect)

    layers = []

    if resource.capmode == NEXTGIS_GEOSERVICES:
        comp = request.env.component(TMSClientComponent)
        try:
            result = requests.get(
                comp.options["nextgis_geoservices.layers"],
                headers=comp.headers,
                timeout=comp.options["timeout"].total_seconds(),
            )
            # raise_for_status() is the only call above that can raise
            # HTTPError; requests.get() itself only raises other
            # RequestException subclasses (connection errors, timeouts...).
            result.raise_for_status()
        except HTTPError as exc:
            raise ExternalServiceError(
                gettextf("The remote server returned an unexpected HTTP status code ({}).")(
                    result.status_code
                ),
                data=response_diagnostics(result),
            ) from exc
        except RequestException as exc:
            logger.error("External service request failed: %s: %s", type(exc).__name__, exc)
            raise ExternalServiceError(
                gettext("Unable to get a response from the remote server."),
                detail=f"{type(exc).__name__}.",
            ) from exc

        try:
            layers_data = result.json()
        except JSONDecodeError as exc:
            raise ExternalServiceError(
                gettext("Failed to parse the JSON response from the remote server."),
                data=response_diagnostics(result),
            ) from exc

        for layer in layers_data:
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


def setup_pyramid(comp: TMSClientComponent, config):
    config.add_route(
        "tmsclient.connection.inspect",
        "/api/resource/{id}/tmsclient/inspect",
        factory=ResourceFactory(context=TMSConnection),
        get=inspect_connection,
    )
