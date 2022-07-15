import json

import requests
from requests.exceptions import RequestException
from sqlalchemy import sql

from ..core.exception import ValidationError, ExternalServiceError
from ..env import env
from ..lib.geometry import Geometry, Transformer, geom_area, geom_length
from ..models import DBSession

from .model import SRS
from .util import convert_to_wkt, _


def serialize(obj):
    return dict(
        id=obj.id, display_name=obj.display_name,
        auth_name=obj.auth_name, auth_srid=obj.auth_srid,
        wkt=obj.wkt, catalog_id=obj.catalog_id,
        system=obj.system, protected=obj.protected,
    )


def deserialize(obj, data, *, create):
    for k, v in data.items():
        if (
            (k in ('id', 'auth_name', 'auth_srid', 'catalog_id'))
            and (create or v != getattr(obj, k))
        ):
            raise ValidationError(message=_(
                "SRS attribute '{}' cannot be changed or set during creation."
            ).format(k))
        elif k in ('display_name', 'wkt'):
            if not isinstance(v, str):
                raise ValidationError(message=_(
                    "SRS attribute '{}' must have a string value."
                ).format(k))
            if k == 'display_name':
                with DBSession.no_autoflush:
                    existing = SRS.filter_by(display_name=v) \
                        .filter(SRS.id != obj.id).first()
                    if existing:
                        raise ValidationError(message=_(
                            "SRS display name is not unique."))
            if (
                k == 'wkt' and not create and obj.protected
                and v != getattr(obj, k)
            ):
                raise ValidationError(message=_(
                    "OGC WKT definition cannot be changed for this SRS."))
            setattr(obj, k, v)
        elif k in ('system', 'protected'):
            pass


def cget(request):
    return [serialize(obj) for obj in SRS.query()]


def cpost(request):
    request.require_administrator()

    obj = SRS().persist()
    deserialize(obj, request.json_body, create=True)

    DBSession.flush()
    return dict(id=obj.id)


def iget(request):
    obj = SRS.filter_by(id=request.matchdict["id"]).one()
    return serialize(obj)


def iput(request):
    request.require_administrator()

    obj = SRS.filter_by(id=int(request.matchdict['id'])).one()
    deserialize(obj, request.json_body, create=False)
    return dict(id=obj.id)


def idelete(request):
    request.require_administrator()

    obj = SRS.filter_by(id=int(request.matchdict['id'])).one()
    if obj.system:
        raise ValidationError(message=_(
            "System SRS cannot be deleted."))

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

    conflict_filter = SRS.catalog_id == srs['id']

    if srs['postgis_srid'] is not None:
        obj.id = srs['postgis_srid']
        conflict_filter = sql.or_(conflict_filter, SRS.id == srs['postgis_srid'])

    conflict = SRS.filter(conflict_filter).first()
    if conflict:
        raise ValidationError(message=_(
            "SRS '{}' already exists (id={}).").format(srs['display_name'], conflict.id))

    if srs['auth_name'] is not None and srs['auth_srid'] is not None:
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
