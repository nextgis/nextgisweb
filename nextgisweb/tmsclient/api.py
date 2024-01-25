import requests
from requests.exceptions import RequestException

from nextgisweb.core.exception import ExternalServiceError
from nextgisweb.pyramid import JSONType
from nextgisweb.resource import ConnectionScope, ResourceFactory

from .model import NEXTGIS_GEOSERVICES, Connection


def inspect_connection(request) -> JSONType:
    request.resource_permission(ConnectionScope.connect)

    connection = request.context

    layers = []

    if connection.capmode == NEXTGIS_GEOSERVICES:
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
                dict(
                    layer=layer["layer"],
                    description=layer["description"],
                    tilesize=layer["tile_size"],
                    minzoom=layer["min_zoom"],
                    maxzoom=layer["max_zoom"],
                    bounds=layer["bounds"],
                )
            )

    return layers


def setup_pyramid(comp, config):
    config.add_route(
        "tmsclient.connection.layers",
        "/api/component/tmsclient/{id}/layers/",
        factory=ResourceFactory(context=Connection),
        get=inspect_connection,
    )
