# -*- coding: utf-8 -*-
from __future__ import division, absolute_import, print_function, unicode_literals

import json

import requests
from pyproj import CRS

from ..core.exception import ValidationError
from ..env import env
from ..lib.geometry import Geometry, Transformer, geom_calc as shp_geom_calc
from ..models import DBSession

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
    geom = Geometry.from_wkt(request.json_body["geom"])

    transformer = Transformer(srs_from.wkt, srs_to.wkt)
    geom = transformer.transform(geom)

    return dict(geom=geom.wkt)


def geom_calc(request, prop):
    srs_from_id = request.json_body["srs"] if "srs" in request.json_body else None
    srs_to = SRS.filter_by(id=int(request.matchdict["id"])).one()
    geom = Geometry.from_wkt(request.json_body["geom"])

    crs_to = CRS.from_wkt(srs_to.wkt)

    if srs_from_id and srs_from_id != srs_to.id:
        srs_from = SRS.filter_by(id=int(srs_from_id)).one()
        transformer = Transformer(srs_from.wkt, srs_to.wkt)
        geom = transformer.transform(geom)

    value = shp_geom_calc(geom.shape, crs_to, prop, srs_to.id)
    return dict(value=value)


def catalog_collection(request):
    request.require_administrator()

    query = dict()

    q = request.GET.get('q')
    if q is not None:
        query['q'] = q

    lat = request.GET.get('lat')
    lon = request.GET.get('lon')
    if lat is not None and lon is not None:
        query['intersects'] = json.dumps(dict(
            type='Point',
            coordinates=(float(lon), float(lat))
        ))

    catalog_url = env.spatial_ref_sys.options['catalog.url']
    url = catalog_url + '/api/v1/spatial_ref_sys/'
    res = requests.get(url, query)
    res.raise_for_status()

    items = list()
    for srs in res.json():
        items.append(dict(
            id=srs['id'],
            display_name=srs['display_name'],
            auth_name=srs['auth_name'],
            auth_srid=srs['auth_srid']
        ))

    return items


def get_srs_from_catalog(catalog_id):
    catalog_url = env.spatial_ref_sys.options['catalog.url']
    url = catalog_url + '/api/v1/spatial_ref_sys/' + str(catalog_id)
    res = requests.get(url)
    res.raise_for_status()

    return res.json()


def catalog_item(request):
    request.require_administrator()

    catalog_id = int(request.matchdict['id'])
    srs = get_srs_from_catalog(catalog_id)

    return dict(display_name=srs['display_name'], wkt=srs['wkt'])


def catalog_import(request):
    request.require_administrator()

    catalog_id = int(request.json_body['catalog_id'])
    srs = get_srs_from_catalog(catalog_id)

    obj = SRS(
        display_name=srs['display_name'],
        wkt=srs['wkt'],
        catalog_id=srs['id']
    )

    if None not in (srs['auth_name'], srs['auth_srid'], srs['postgis_srid']):
        conflict = SRS.filter_by(id=srs['postgis_srid']).first()
        if conflict:
            raise ValidationError(_("Coordinate system (id=%d) already exists.")
                                  % srs['postgis_srid'])
        obj.id = srs['postgis_srid']
        obj.auth_name = srs['auth_name']
        obj.auth_srid = srs['auth_srid']

    obj.persist()
    DBSession.flush()

    return dict(id=obj.id)


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

    if comp.options['catalog.enabled']:
        config.add_route(
            "spatial_ref_sys.catalog.collection", r"/api/component/spatial_ref_sys/catalog/",
        ).add_view(catalog_collection, request_method="GET", renderer="json")

        config.add_route(
            "spatial_ref_sys.catalog.item", r"/api/component/spatial_ref_sys/catalog/{id:\d+}",
        ).add_view(catalog_item, request_method="GET", renderer="json")

        config.add_route(
            "spatial_ref_sys.catalog.import", r"/api/component/spatial_ref_sys/catalog/import",
        ).add_view(catalog_import, request_method="POST", renderer="json")
