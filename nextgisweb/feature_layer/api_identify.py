from typing import List

from msgspec import Struct

from nextgisweb.env import DBSession, gettext
from nextgisweb.lib.geometry import Geometry, GeometryNotValid

from nextgisweb.core.exception import ValidationError
from nextgisweb.pyramid import JSONType
from nextgisweb.resource import DataScope, Resource, ResourceScope

from .interface import IFeatureLayer


class IdentifyBody(Struct, kw_only=True):
    geom: str
    srs: int
    layers: List[int]


def identify(request, *, body: IdentifyBody) -> JSONType:
    """Find features intersecting geometry"""

    try:
        geom = Geometry.from_wkt(body.geom, srid=body.srs)
    except GeometryNotValid:
        raise ValidationError(gettext("Geometry is not valid."))

    # Number of features in all layers
    feature_count = 0

    query = DBSession.query(Resource).filter(Resource.id.in_(body.layers))
    result = dict()
    for layer in query:
        layer_id_str = str(layer.id)
        if not layer.has_permission(DataScope.read, request.user):
            result[layer_id_str] = dict(error="Forbidden")

        elif not IFeatureLayer.providedBy(layer):
            result[layer_id_str] = dict(error="Not implemented")

        else:
            query = layer.feature_query()
            query.intersects(geom)

            # Limit number of identifiable features by 100 per layer,
            # otherwise the response might be too big.
            query.limit(100)

            features = [
                dict(
                    id=f.id,
                    layerId=layer.id,
                    label=f.label,
                    fields=f.fields,
                )
                for f in query()
            ]

            # Add name of parent resource to identification results,
            # if there is no way to get layer name by id on the client
            allow = layer.parent.has_permission(ResourceScope.read, request.user)

            if allow:
                for feature in features:
                    feature["parent"] = layer.parent.display_name

            result[layer_id_str] = dict(features=features, featureCount=len(features))

            feature_count += len(features)

    result["featureCount"] = feature_count

    return result


def setup_pyramid(comp, config):
    config.add_route(
        "feature_layer.identify",
        "/api/feature_layer/identify",
        post=identify,
    )
