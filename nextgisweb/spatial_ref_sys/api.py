import json

import requests
from requests.exceptions import RequestException

from ..core.exception import ValidationError, ExternalServiceError
from ..env import env
from ..lib.geometry import Geometry, Transformer, geom_area, geom_length
from ..models import DBSession

from .model import SRS
from .util import convert_to_wkt, _


def check_srs_unique(data, existing_id=None):
    query = SRS.filter_by(display_name=data.get("display_name"))
    if existing_id is not None:
        query = query.filter(SRS.id != existing_id)
    if query.first() is not None:
        raise ValidationError(message=_(
            "Coordinate system name is not unique."))


def cget(request):
    srs_collection = list(map(lambda o: dict(
        id=o.id, display_name=o.display_name,
        auth_name=o.auth_name, auth_srid=o.auth_srid,
        wkt=o.wkt, disabled=o.disabled,
    ), SRS.query()))
    return sorted(srs_collection, key=lambda srs: srs["id"] != 4326)


def cpost(request):
    request.require_administrator()

    data = request.json_body
    check_srs_unique(data)
    obj = SRS(**data)
    obj.persist()

    DBSession.flush()
    return dict(id=obj.id)


def iget(request):
    obj = SRS.filter_by(id=request.matchdict["id"]).one()
    return dict(
        id=obj.id, display_name=obj.display_name,
        auth_name=obj.auth_name, auth_srid=obj.auth_srid,
        wkt=obj.wkt
    )


def iput(request):
    request.require_administrator()

    obj = SRS.filter_by(id=int(request.matchdict['id'])).one()
    data = request.json_body
    check_srs_unique(data, obj.id)

    disallowed_wkt_change = obj.disabled and obj.wkt != data.get("wkt")
    if disallowed_wkt_change:
        raise ValidationError(message=_(
            "Cannot change wkt definition of standard coordinate system."))

    obj.display_name = data.get('display_name')
    obj.wkt = data.get('wkt', False)
    DBSession.flush()

    return dict(id=obj.id)


def idelete(request):
    request.require_administrator()

    obj = SRS.filter_by(id=int(request.matchdict['id'])).one()
    disabled = obj.disabled
    if disabled:
        raise ValidationError(message=_(
            "Unable to delete standard coordinate system."))
    DBSession.delete(obj)
    return None


def srs_convert(request):
    data = request.json_body
    proj_str = data["projStr"]
    format = data["format"]
    wkt = convert_to_wkt(proj_str, format, pretty=True)
    if not wkt:
        raise ValidationError(_("Invalid SRS definition!"))

    return dict(wkt=wkt)


def geom_transform(request):
    data = request.json_body
    srs_from = SRS.filter_by(id=int(data["srs"])).one()
    srs_to = SRS.filter_by(id=int(request.matchdict["id"])).one()
    geom = Geometry.from_wkt(data["geom"])

    transformer = Transformer(srs_from.wkt, srs_to.wkt)
    geom = transformer.transform(geom)

    return dict(geom=geom.wkt)


def geom_calc(request, measure_fun):
    data = request.json_body
    srs_to = SRS.filter_by(id=int(request.matchdict['id'])).one()
    srs_from_id = data.get('srs', srs_to.id)

    geom = Geometry.from_geojson(data['geom']) \
        if data.get('geom_format') == 'geojson' \
        else Geometry.from_wkt(data['geom'])

    if srs_from_id != srs_to.id:
        srs_from = SRS.filter_by(id=srs_from_id).one()
        transformer = Transformer(srs_from.wkt, srs_to.wkt)
        geom = transformer.transform(geom)

    value = measure_fun(geom, srs_to.wkt)
    return dict(value=value)


def catalog_collection(request):
    request.require_administrator()

    query = dict()

    q = request.GET.get('q')
    if q is not None:
        query['q'] = q

    if request.env.spatial_ref_sys.options['catalog.coordinates_search']:
        lat = request.GET.get('lat')
        lon = request.GET.get('lon')
        if lat is not None and lon is not None:
            query['intersects'] = json.dumps(dict(
                type='Point',
                coordinates=(float(lon), float(lat))
            ))

    catalog_url = env.spatial_ref_sys.options['catalog.url']
    url = catalog_url + '/api/v1/spatial_ref_sys/'
    timeout = env.spatial_ref_sys.options['catalog.timeout'].total_seconds()
    try:
        res = requests.get(url, query, timeout=timeout)
        res.raise_for_status()
    except RequestException:
        raise ExternalServiceError()

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
    timeout = env.spatial_ref_sys.options['catalog.timeout'].total_seconds()
    try:
        res = requests.get(url, timeout=timeout)
        res.raise_for_status()
    except RequestException:
        raise ExternalServiceError()

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
    config.add_route("spatial_ref_sys.collection", "/api/component/spatial_ref_sys/") \
        .add_view(cget, request_method="GET", renderer="json") \
        .add_view(cpost, request_method='POST', renderer='json')

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
    ).add_view(lambda r: geom_calc(r, geom_length), request_method="POST", renderer="json")

    config.add_route(
        "spatial_ref_sys.geom_area",
        r"/api/component/spatial_ref_sys/{id:\d+}/geom_area"
    ).add_view(lambda r: geom_calc(r, geom_area), request_method="POST", renderer="json")

    config.add_route("spatial_ref_sys.item", r"/api/component/spatial_ref_sys/{id:\d+}")\
        .add_view(iget, request_method="GET", renderer="json")\
        .add_view(iput, request_method='PUT', renderer='json') \
        .add_view(idelete, request_method='DELETE', renderer='json')

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
