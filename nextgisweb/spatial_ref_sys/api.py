# -*- coding: utf-8 -*-
from __future__ import division, absolute_import, print_function, unicode_literals

from pyramid.response import Response

from .models import SRS
from .util import convert_projstr_to_wkt, _
from ..geometry import geom_wkt_transform
from nextgisweb.core.exception import ValidationError


def collection(request):
    srs_collection = list(map(lambda o: dict(
        id=o.id, display_name=o.display_name,
        auth_name=o.auth_name, auth_srid=o.auth_srid,
        wkt=o.wkt
    ), SRS.query()))
    return sorted(srs_collection, key=lambda srs: srs["id"] != 4326)


def get(request):
    obj = SRS.filter_by(id=request.matchdict["id"]).one()
    return dict(
        id=obj.id, display_name=obj.display_name,
        auth_name=obj.auth_name, auth_srid=obj.auth_srid,
        wkt=obj.wkt
    )


def srs_convert(request):
    proj_str = request.POST.get("projStr")
    format = request.POST.get("format")
    wkt = convert_projstr_to_wkt(proj_str, format, pretty=True)
    if not wkt:
        raise ValidationError(_("Invalid SRS definition!"))

    return dict(wkt=wkt)


def geom_transform(request):
    srs_from = SRS.filter_by(id=int(request.json_body["srs_id_from"])).one()
    srs_to = SRS.filter_by(id=int(request.json_body["srs_id_to"])).one()
    geom_wkt = request.json_body["geom"]
    geom_wkt_transformed = geom_wkt_transform(geom_wkt, srs_from, srs_to)

    return Response(geom_wkt_transformed)


def setup_pyramid(comp, config):
    config.add_route(
        "spatial_ref_sys.collection", "/api/component/spatial_ref_sys/",
    ).add_view(collection, request_method="GET", renderer="json")

    config.add_route(
        "spatial_ref_sys.get", "/api/component/spatial_ref_sys/{id}",
    ).add_view(get, request_method="GET", renderer="json")

    config.add_route("spatial_ref_sys.convert", "/api/component/spatial_ref_sys/convert/") \
        .add_view(srs_convert, request_method="POST", renderer="json")

    config.add_route(
        "spatial_ref_sys.geom_transform", "/api/component/spatial_ref_sys/geom_transform/") \
        .add_view(geom_transform, request_method="POST")
