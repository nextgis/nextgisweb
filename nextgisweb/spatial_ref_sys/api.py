# -*- coding: utf-8 -*-
from __future__ import division, absolute_import, print_function, unicode_literals

from pyproj import CRS

from ..core.exception import ValidationError
from ..geometry import (
    geom_from_wkt,
    geom_to_wkt,
    geom_transform as shp_geom_transform,
    geom_calc as shp_geom_calc,
)
from .models import SRS
from .util import convert_to_wkt, _


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
    wkt = convert_to_wkt(proj_str, format, pretty=True)
    if not wkt:
        raise ValidationError(_("Invalid SRS definition!"))

    return dict(wkt=wkt)


def geom_transform(request):
    srs_from = SRS.filter_by(id=int(request.json_body["srs"])).one()
    srs_to = SRS.filter_by(id=int(request.matchdict["id"])).one()
    geom = geom_from_wkt(request.json_body["geom"])

    crs_from = CRS.from_wkt(srs_from.wkt)
    crs_to = CRS.from_wkt(srs_to.wkt)
    geom_transformed = shp_geom_transform(geom, crs_from, crs_to)

    return dict(geom=geom_to_wkt(geom_transformed))


def geom_calc(request, prop):
    srs_from_id = request.json_body["srs"] if "srs" in request.json_body else None
    srs_to = SRS.filter_by(id=int(request.matchdict["id"])).one()
    geom = geom_from_wkt(request.json_body["geom"])

    crs_to = CRS.from_wkt(srs_to.wkt)

    if srs_from_id and srs_from_id != srs_to.id:
        srs_from = SRS.filter_by(id=int(srs_from_id)).one()
        crs_from = CRS.from_wkt(srs_from.wkt)
        geom = shp_geom_transform(geom, crs_from, crs_to)

    value = shp_geom_calc(geom, crs_to, prop, srs_to.id)
    return dict(value=value)


def setup_pyramid(comp, config):
    config.add_route(
        "spatial_ref_sys.collection", "/api/component/spatial_ref_sys/",
    ).add_view(collection, request_method="GET", renderer="json")

    config.add_route("spatial_ref_sys.convert", "/api/component/spatial_ref_sys/convert") \
        .add_view(srs_convert, request_method="POST", renderer="json")

    config.add_route(
        "spatial_ref_sys.geom_transform",
        r"/api/component/spatial_ref_sys/{id:\d+}/geom_transform"
    ) \
        .add_view(geom_transform, request_method="POST", renderer="json")

    config.add_route(
        "spatial_ref_sys.geom_length",
        r"/api/component/spatial_ref_sys/{id:\d+}/geom_length"
    ).add_view(lambda r: geom_calc(r, "length"), request_method="POST", renderer="json")

    config.add_route(
        "spatial_ref_sys.geom_area",
        r"/api/component/spatial_ref_sys/{id:\d+}/geom_area"
    ).add_view(lambda r: geom_calc(r, "area"), request_method="POST", renderer="json")

    config.add_route(
        "spatial_ref_sys.get", r"/api/component/spatial_ref_sys/{id:\d+}",
    ).add_view(get, request_method="GET", renderer="json")
