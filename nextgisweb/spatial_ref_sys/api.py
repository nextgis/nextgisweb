# -*- coding: utf-8 -*-
from __future__ import division, absolute_import, print_function, unicode_literals

from pyramid.response import Response
from pyproj import CRS
from backports.functools_lru_cache import lru_cache

from .models import SRS
from .util import convert_projstr_to_wkt, _
from ..geometry import (
    geom_from_wkt,
    geom_to_wkt,
    geom_transform as shp_geom_transform,
    geom_calc as shp_geom_calc
)
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


@lru_cache(maxsize=32)  # TODO: validate on update
def get_proj4(srs_id):
    srs = SRS.filter_by(id=srs_id).one()
    return srs.proj4


def geom_transform(request):
    proj4_from = get_proj4(int(request.json_body["srs_id_from"]))
    proj4_to = get_proj4(int(request.json_body["srs_id_to"]))
    geom = geom_from_wkt(request.json_body["geom"])

    crs_from = CRS.from_proj4(proj4_from)
    crs_to = CRS.from_proj4(proj4_to)
    geom_transformed = shp_geom_transform(geom, crs_from, crs_to)

    return Response(geom_to_wkt(geom_transformed))


def geom_calc(request, prop):
    proj4_from = get_proj4(int(request.json_body["srs_id_from"]))
    srs_id_to = int(request.json_body["srs_id_to"])
    proj4_to = get_proj4(srs_id_to)
    geom = geom_from_wkt(request.json_body["geom"])

    crs_from = CRS.from_proj4(proj4_from)
    crs_to = CRS.from_proj4(proj4_to)
    geom_transformed = shp_geom_transform(geom, crs_from, crs_to)

    result = shp_geom_calc(geom_transformed, crs_to, prop, srs_id_to)
    return result


def setup_pyramid(comp, config):
    config.add_route(
        "spatial_ref_sys.collection", "/api/component/spatial_ref_sys/",
    ).add_view(collection, request_method="GET", renderer="json")

    config.add_route(
        "spatial_ref_sys.get", "/api/component/spatial_ref_sys/{id}",
    ).add_view(get, request_method="GET", renderer="json")

    config.add_route("spatial_ref_sys.convert", "/api/component/spatial_ref_sys/convert") \
        .add_view(srs_convert, request_method="POST", renderer="json")

    config.add_route(
        "spatial_ref_sys.geom_transform", "/api/component/spatial_ref_sys/geom_transform") \
        .add_view(geom_transform, request_method="POST")

    config.add_route(
        "spatial_ref_sys.geom_length", "/api/component/spatial_ref_sys/geom_length") \
        .add_view(lambda r: geom_calc(r, "length"), request_method="POST", renderer="json")

    config.add_route(
        "spatial_ref_sys.geom_area", "/api/component/spatial_ref_sys/geom_area") \
        .add_view(lambda r: geom_calc(r, "area"), request_method="POST", renderer="json")
