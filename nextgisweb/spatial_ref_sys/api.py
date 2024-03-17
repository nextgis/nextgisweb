import json

import requests
from msgspec import Meta, Struct
from requests.exceptions import RequestException
from sqlalchemy import sql
from typing_extensions import Annotated

from nextgisweb.env import DBSession, _, env
from nextgisweb.lib.geometry import Geometry, Transformer, geom_area, geom_length

from nextgisweb.core.exception import ExternalServiceError, ValidationError
from nextgisweb.pyramid import JSONType

from .model import SRS
from .pyramid import require_catalog_configured
from .util import convert_to_wkt

SRSID = Annotated[int, Meta(ge=1, description="Spatial reference system ID")]
SRSCatalogID = Annotated[int, Meta(ge=1, description="ID of spatial reference system in catalog")]


def serialize(obj: SRS):
    return dict(
        id=obj.id,
        display_name=obj.display_name,
        auth_name=obj.auth_name,
        auth_srid=obj.auth_srid,
        wkt=obj.wkt,
        catalog_id=obj.catalog_id,
        system=obj.system,
        protected=obj.protected,
        geographic=obj.is_geographic,
    )


def deserialize(obj, data, *, create):
    for k, v in data.items():
        if (k in ("id", "auth_name", "auth_srid", "catalog_id")) and (
            create or v != getattr(obj, k)
        ):
            raise ValidationError(
                message=_("SRS attribute '{}' cannot be changed or set during creation.").format(k)
            )
        elif k in ("display_name", "wkt"):
            if not isinstance(v, str):
                raise ValidationError(
                    message=_("SRS attribute '{}' must have a string value.").format(k)
                )
            if k == "display_name":
                with DBSession.no_autoflush:
                    existing = SRS.filter_by(display_name=v).filter(SRS.id != obj.id).first()
                    if existing:
                        raise ValidationError(message=_("SRS display name is not unique."))
            if k == "wkt" and not create and obj.protected and v != getattr(obj, k):
                raise ValidationError(
                    message=_("OGC WKT definition cannot be changed for this SRS.")
                )
            setattr(obj, k, v)
        elif k in ("system", "protected"):
            pass


def cget(request) -> JSONType:
    return [serialize(obj) for obj in SRS.query()]


def cpost(request) -> JSONType:
    request.user.require_permission(SRS.permissions.manage)

    obj = SRS().persist()
    deserialize(obj, request.json_body, create=True)

    DBSession.flush()
    return dict(id=obj.id)


def iget(request) -> JSONType:
    obj = SRS.filter_by(id=request.matchdict["id"]).one()
    return serialize(obj)


def iput(request) -> JSONType:
    request.user.require_permission(SRS.permissions.manage)

    obj = SRS.filter_by(id=int(request.matchdict["id"])).one()
    deserialize(obj, request.json_body, create=False)
    return dict(id=obj.id)


def idelete(request) -> JSONType:
    request.user.require_permission(SRS.permissions.manage)

    obj = SRS.filter_by(id=int(request.matchdict["id"])).one()
    if obj.system:
        raise ValidationError(message=_("System SRS cannot be deleted."))

    DBSession.delete(obj)
    return None


def srs_convert(request) -> JSONType:
    data = request.json_body
    proj_str = data["projStr"]
    format = data["format"]
    wkt = convert_to_wkt(proj_str, format, pretty=True)
    if not wkt:
        raise ValidationError(_("Invalid SRS definition!"))

    return dict(wkt=wkt)


def geom_transform(request) -> JSONType:
    data = request.json_body
    srs_from = SRS.filter_by(id=int(data["srs"])).one()
    srs_to = SRS.filter_by(id=int(request.matchdict["id"])).one()
    geom = Geometry.from_wkt(data["geom"])

    transformer = Transformer(srs_from.wkt, srs_to.wkt)
    geom = transformer.transform(geom)

    return dict(geom=geom.wkt)


def geom_transform_batch(request) -> JSONType:
    data = request.json_body
    srs_from = SRS.filter_by(id=int(data["srs_from"])).one()
    srs_to = SRS.filter(SRS.id.in_([int(s) for s in data["srs_to"]]))

    result = []
    for srs in srs_to:
        transformer = Transformer(srs_from.wkt, srs.wkt)
        geom = Geometry.from_wkt(data["geom"])
        geom_srs_to = transformer.transform(geom)
        result.append(dict(srs_id=srs.id, geom=geom_srs_to.wkt))

    return result


class GeometryPropertyResponse(Struct):
    value: float


def geom_calc(request, measure_fun):
    data = request.json_body
    srs_to = SRS.filter_by(id=int(request.matchdict["id"])).one()
    srs_from_id = data.get("srs", srs_to.id)

    geom = (
        Geometry.from_geojson(data["geom"])
        if data.get("geom_format") == "geojson"
        else Geometry.from_wkt(data["geom"])
    )

    if srs_from_id != srs_to.id:
        srs_from = SRS.filter_by(id=srs_from_id).one()
        transformer = Transformer(srs_from.wkt, srs_to.wkt)
        geom = transformer.transform(geom)

    value = measure_fun(geom, srs_to.wkt)
    return GeometryPropertyResponse(value=value)


def geom_length_post(request) -> GeometryPropertyResponse:
    return geom_calc(request, geom_length)


def geom_area_post(request) -> GeometryPropertyResponse:
    return geom_calc(request, geom_area)


def catalog_collection(request) -> JSONType:
    request.require_administrator()
    require_catalog_configured()

    query = dict()

    q = request.GET.get("q")
    if q is not None:
        query["q"] = q

    if request.env.spatial_ref_sys.options["catalog.coordinates_search"]:
        lat = request.GET.get("lat")
        lon = request.GET.get("lon")
        if lat is not None and lon is not None:
            query["intersects"] = json.dumps(
                dict(type="Point", coordinates=(float(lon), float(lat)))
            )

    catalog_url = env.spatial_ref_sys.options["catalog.url"]
    url = catalog_url + "/api/v1/spatial_ref_sys/"
    timeout = env.spatial_ref_sys.options["catalog.timeout"].total_seconds()
    try:
        res = requests.get(url, query, timeout=timeout)
        res.raise_for_status()
    except RequestException:
        raise ExternalServiceError()

    items = list()
    for srs in res.json():
        items.append(
            dict(
                id=srs["id"],
                display_name=srs["display_name"],
                auth_name=srs["auth_name"],
                auth_srid=srs["auth_srid"],
            )
        )

    return items


def catalog_item(request) -> JSONType:
    request.require_administrator()
    require_catalog_configured()

    catalog_id = int(request.matchdict["id"])
    srs = get_srs_from_catalog(catalog_id)

    return dict(display_name=srs["display_name"], wkt=srs["wkt"])


def catalog_import(request) -> JSONType:
    request.require_administrator()
    require_catalog_configured()

    catalog_id = int(request.json_body["catalog_id"])
    srs = get_srs_from_catalog(catalog_id)

    auth_name = srs["auth_name"]
    auth_srid = srs["auth_srid"]
    if auth_name is None or auth_srid is None:
        raise ValidationError(
            message=_(
                "SRS authority attributes must be defined " "while importing from the catalog."
            )
        )

    obj = SRS(
        display_name=srs["display_name"],
        wkt=srs["wkt"],
        auth_name=auth_name,
        auth_srid=auth_srid,
        catalog_id=srs["id"],
    )

    conflict_filter = [
        SRS.catalog_id == srs["id"],
        sql.and_(
            SRS.auth_name == auth_name,
            SRS.auth_srid == auth_srid,
        ),
    ]

    if postgis_srid := srs["postgis_srid"]:
        obj.id = postgis_srid
        conflict_filter.append(SRS.id == postgis_srid)

    conflict = SRS.filter(sql.or_(*conflict_filter)).first()
    if conflict:
        raise ValidationError(message=_("SRS #{} already exists.").format(conflict.id))

    obj.persist()
    DBSession.flush()

    return dict(id=obj.id)


def get_srs_from_catalog(catalog_id):
    catalog_url = env.spatial_ref_sys.options["catalog.url"]
    url = catalog_url + "/api/v1/spatial_ref_sys/" + str(catalog_id)
    timeout = env.spatial_ref_sys.options["catalog.timeout"].total_seconds()
    try:
        res = requests.get(url, timeout=timeout)
        res.raise_for_status()
    except RequestException:
        raise ExternalServiceError()

    return res.json()


def setup_pyramid(comp, config):
    config.add_route(
        "spatial_ref_sys.collection",
        "/api/component/spatial_ref_sys/",
        get=cget,
        post=cpost,
    )

    config.add_route(
        "spatial_ref_sys.convert",
        "/api/component/spatial_ref_sys/convert",
        post=srs_convert,
    )

    config.add_route(
        "spatial_ref_sys.geom_transform.batch",
        "/api/component/spatial_ref_sys/geom_transform",
        post=geom_transform_batch,
    )

    config.add_route(
        "spatial_ref_sys.geom_transform",
        "/api/component/spatial_ref_sys/{id}/geom_transform",
        types=dict(id=SRSID),
        post=geom_transform,
    )

    config.add_route(
        "spatial_ref_sys.geom_length",
        "/api/component/spatial_ref_sys/{id}/geom_length",
        types=dict(id=SRSID),
        post=geom_length_post,
    )

    config.add_route(
        "spatial_ref_sys.geom_area",
        "/api/component/spatial_ref_sys/{id}/geom_area",
        types=dict(id=SRSID),
        post=geom_area_post,
    )

    config.add_route(
        "spatial_ref_sys.item",
        "/api/component/spatial_ref_sys/{id}",
        types=dict(id=SRSID),
        get=iget,
        put=iput,
        delete=idelete,
    )

    config.add_route(
        "spatial_ref_sys.catalog.collection",
        "/api/component/spatial_ref_sys/catalog/",
        get=catalog_collection,
    )

    config.add_route(
        "spatial_ref_sys.catalog.item",
        "/api/component/spatial_ref_sys/catalog/{id}",
        types=dict(id=SRSCatalogID),
        get=catalog_item,
    )

    config.add_route(
        "spatial_ref_sys.catalog.import",
        "/api/component/spatial_ref_sys/catalog/import",
        post=catalog_import,
    )
