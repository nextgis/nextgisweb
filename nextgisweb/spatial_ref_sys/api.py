import json
from typing import Any, Dict, List, Literal

import requests
from msgspec import UNSET, Meta, Struct, UnsetType
from requests.exceptions import RequestException
from sqlalchemy import sql
from typing_extensions import Annotated, Union

from nextgisweb.env import DBSession, env, gettext
from nextgisweb.lib.apitype import OP, AsJSON, Derived, EmptyObject, ReadOnly, Required, StatusCode
from nextgisweb.lib.geometry import Geometry, Transformer, geom_area, geom_length

from nextgisweb.core.exception import ExternalServiceError, ValidationError
from nextgisweb.jsrealm import TSExport

from .model import SRID_MAX, SRS, WKT_EPSG_4326
from .pyramid import require_catalog_configured
from .util import SRSFormat, convert_to_wkt

SRSID = Annotated[
    int,
    Meta(ge=1, le=SRID_MAX, description="Spatial reference system ID"),
    Meta(examples=[4326]),
]

DisplayName = Annotated[str, Meta(min_length=1, description="Display name", examples=["WGS 84"])]
SRSWKT = Annotated[str, Meta(description="OGC WKT definition", examples=[WKT_EPSG_4326])]
SRSSystem = Annotated[bool, Meta(description="System default SRS flag")]
SRSProtected = Annotated[bool, Meta(description="OGC WKT protection (read-only) flag")]
SRSGeographic = Annotated[bool, Meta(description="Geographic SRS flag")]
CatalogID = Annotated[int, Meta(ge=1)]

AuthNameMeta = Meta(description="Authority name", examples=["EPSG"])
AuthSRIDMeta = Meta(description="Authority identifier", examples=[4326])
CatalogIDMeta = Meta(description="ID of SRS in catalog")

GeomWKT = Annotated[
    str,
    Meta(
        description="Geometry in WKT format",
        examples=["LINESTRING(30 10, 10 30, 40 40)"],
    ),
]
GeomGeoJSON = Annotated[
    Dict[str, Any],
    Meta(
        description="Geometry in GeoJSON format",
        examples=[{"type": "LineString", "coordinates": [[30, 10], [10, 30], [40, 40]]}],
    ),
]


class SRSRef(Struct, kw_only=True):
    id: SRSID


class _SRS(Struct, kw_only=True):
    id: ReadOnly[SRSID]
    display_name: Required[DisplayName]
    auth_name: ReadOnly[Annotated[Union[str, None], AuthNameMeta]]
    auth_srid: ReadOnly[Annotated[Union[int, None], AuthSRIDMeta]]
    wkt: Required[SRSWKT]
    catalog_id: ReadOnly[Annotated[Union[CatalogID, None], CatalogIDMeta]]
    system: ReadOnly[SRSSystem]
    protected: ReadOnly[SRSProtected]
    geographic: ReadOnly[SRSGeographic]


SRSCreate = Derived[_SRS, OP.CREATE]
SRSRead = Derived[_SRS, OP.READ]
SRSUpdate = Derived[_SRS, OP.UPDATE]


def serialize(obj: SRS) -> SRSRead:
    return SRSRead(
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


def deserialize(obj, data: SRSCreate, *, create: bool):
    if (display_name := data.display_name) is not UNSET:
        with DBSession.no_autoflush:
            existing = SRS.filter_by(display_name=display_name).filter(SRS.id != obj.id).first()
            if existing:
                raise ValidationError(("SRS display name is not unique."))
        obj.display_name = display_name

    if (wkt := data.wkt) is not UNSET:
        if not create and obj.protected and wkt != data.wkt:
            raise ValidationError(("OGC WKT definition cannot be changed for this SRS."))
        obj.wkt = wkt


def cget(request) -> AsJSON[List[SRSRead]]:
    """Read spatial reference systems"""
    return [serialize(obj) for obj in SRS.query()]


def cpost(request, *, body: SRSCreate) -> Annotated[SRSRef, StatusCode(201)]:
    """Create spatial reference system"""
    request.user.require_permission(SRS.permissions.manage)

    obj = SRS().persist()
    deserialize(obj, body, create=True)

    DBSession.flush()
    request.response.status_code = 201
    return SRSRef(id=obj.id)


def iget(request, id: SRSID) -> SRSRead:
    """Read spatial reference system"""
    obj = SRS.filter_by(id=id).one()
    return serialize(obj)


def iput(request, id: SRSID, *, body: SRSUpdate) -> SRSRef:
    """Update spatial reference system"""
    request.user.require_permission(SRS.permissions.manage)

    obj = SRS.filter_by(id=id).one()
    deserialize(obj, body, create=False)
    return SRSRef(id=obj.id)


def idelete(request, id: SRSID) -> EmptyObject:
    """Delete spatial reference system"""
    request.user.require_permission(SRS.permissions.manage)

    obj = SRS.filter_by(id=id).one()
    if obj.system:
        raise ValidationError(gettext("System SRS cannot be deleted."))

    DBSession.delete(obj)
    return None


class ConvertBody(Struct, kw_only=True):
    format: Annotated[SRSFormat, TSExport("SRSFormat"), Meta(description="Format")]
    projStr: Annotated[str, Meta(description="SRS definition to covert", examples=["4326"])]


class ConvertResponse(Struct, kw_only=True):
    wkt: SRSWKT


def convert(request, *, body: ConvertBody) -> ConvertResponse:
    """Convert SRS definition into OGC WKT format"""
    wkt = convert_to_wkt(body.projStr, body.format, pretty=True)
    if not wkt:
        raise ValidationError(gettext("Invalid SRS definition!"))

    return ConvertResponse(wkt=wkt)


class GeomTransformBody(Struct, kw_only=True):
    srs: SRSID
    geom: GeomWKT


class GeomTransformResponse(Struct, kw_only=True):
    geom: SRSWKT


def geom_transform(request, id: SRSID, *, body: GeomTransformBody) -> GeomTransformResponse:
    """Transform geometry from one SRS to another"""
    srs_from = SRS.filter_by(id=body.srs).one()
    srs_to = SRS.filter_by(id=id).one()
    geom = Geometry.from_wkt(body.geom)

    transformer = Transformer(srs_from.wkt, srs_to.wkt)
    geom = transformer.transform(geom)

    return GeomTransformResponse(geom=geom.wkt)


class GeomTransformBatchBody(Struct, kw_only=True):
    srs_from: Annotated[SRSID, Meta(description="Source SRS to reproject from")]
    srs_to: Annotated[List[SRSID], Meta(description="Target SRSs to reproject to")]
    geom: Annotated[GeomWKT, Meta(description="Geometry")]


class GeomTransformBatchResponse(Struct, kw_only=True):
    srs_id: SRSWKT
    geom: GeomWKT


def geom_transform_batch(
    request,
    *,
    body: GeomTransformBatchBody,
) -> AsJSON[List[GeomTransformBatchResponse]]:
    """Reproject geometry to multiple SRS"""
    srs_from = SRS.filter_by(id=body.srs_from).one()
    srs_to = SRS.filter(SRS.id.in_([int(s) for s in body.srs_to]))

    result = []
    for srs in srs_to:
        transformer = Transformer(srs_from.wkt, srs.wkt)
        geom = Geometry.from_wkt(body.geom)
        geom_srs_to = transformer.transform(geom)
        result.append(GeomTransformBatchResponse(srs_id=srs.id, geom=geom_srs_to.wkt))

    return result


class GeometryPropertyResponse(Struct):
    value: float


GeometryPropertyGeomFormat = Annotated[
    Literal["geojson", "wkt"],
    Meta(description="Format of the geometry data", examples=["geojson", "wkt"]),
    TSExport("GeometryPropertyGeomFormat"),
]


class GeometryPropertyBody(Struct, kw_only=True):
    srs: Union[SRSID, UnsetType] = UNSET
    geom_format: Union[GeometryPropertyGeomFormat, UnsetType] = UNSET
    geom: Union[GeomWKT, GeomGeoJSON]


def geom_calc(id: SRSID, data: GeometryPropertyBody, measure_fun):
    srs_to = SRS.filter_by(id=id).one()
    if (srs_from_id := data.srs) is UNSET:
        srs_from_id = srs_to.id

    geom = (
        Geometry.from_geojson(data.geom)
        if data.geom_format == "geojson"
        else Geometry.from_wkt(data.geom)
    )

    if srs_from_id != srs_to.id:
        srs_from = SRS.filter_by(id=srs_from_id).one()
        transformer = Transformer(srs_from.wkt, srs_to.wkt)
        geom = transformer.transform(geom)

    value = measure_fun(geom, srs_to.wkt)
    return GeometryPropertyResponse(value=value)


SRSIDCalculation = Annotated[SRSID, Meta(description="ID of SRS to make calculations on")]


def geom_length_post(
    request,
    id: SRSIDCalculation,
    *,
    body: GeometryPropertyBody,
) -> GeometryPropertyResponse:
    """Calculate geometry length on SRS"""
    return geom_calc(id, body, geom_length)


def geom_area_post(
    request,
    id: SRSIDCalculation,
    *,
    body: GeometryPropertyBody,
) -> GeometryPropertyResponse:
    """Calculate geometry area on SRS"""
    return geom_calc(id, body, geom_area)


class SRSCatalogRecord(Struct, kw_only=True):
    id: SRSID
    display_name: DisplayName
    auth_name: Annotated[str, AuthNameMeta]
    auth_srid: Annotated[int, AuthSRIDMeta]


class SRSCatalogItem(Struct, kw_only=True):
    display_name: DisplayName
    wkt: SRSWKT


QueryStr = Annotated[
    Union[str, None],
    Meta(description="Query for name or code based search", examples=["UTM Zone 42N", "4326"]),
]

QueryLat = Annotated[Union[float, None], Meta(description="Latitude", examples=[27.9881])]
QueryLon = Annotated[Union[float, None], Meta(description="Longitude", examples=[86.9250])]


def catalog_collection(
    request,
    *,
    q: QueryStr = None,
    lat: QueryLat = None,
    lon: QueryLon = None,
) -> AsJSON[List[SRSCatalogRecord]]:
    """Search SRS in catalog"""
    request.require_administrator()
    require_catalog_configured()

    query = dict()

    if q is not None:
        query["q"] = q

    if request.env.spatial_ref_sys.options["catalog.coordinates_search"]:
        if lat is not None and lon is not None:
            query["intersects"] = json.dumps(
                dict(type="Point", coordinates=(lon, lat)),
            )

    catalog_url = env.spatial_ref_sys.options["catalog.url"]
    url = catalog_url + "/api/v1/spatial_ref_sys/"
    timeout = env.spatial_ref_sys.options["catalog.timeout"].total_seconds()
    try:
        res = requests.get(url, query, timeout=timeout)
        res.raise_for_status()
    except RequestException:
        raise ExternalServiceError()

    return [
        SRSCatalogRecord(
            id=srs["id"],
            display_name=srs["display_name"],
            auth_name=srs["auth_name"],
            auth_srid=srs["auth_srid"],
        )
        for srs in res.json()
    ]


def catalog_item(request, id: Annotated[CatalogID, CatalogIDMeta]) -> SRSCatalogItem:
    """Read SRS from catalog"""
    request.require_administrator()
    require_catalog_configured()

    srs = get_srs_from_catalog(id)
    return SRSCatalogItem(display_name=srs["display_name"], wkt=srs["wkt"])


class SRSCatalogImportBody(Struct, kw_only=True):
    catalog_id: Annotated[CatalogID, CatalogIDMeta]


class SRSCatalogImportResponse(Struct, kw_only=True):
    id: Annotated[int, Meta(description="Identifier for newly imported SRS", examples=[3395])]


def catalog_import(request, *, body: SRSCatalogImportBody) -> SRSCatalogImportResponse:
    """Import SRS from catalog"""
    request.require_administrator()
    require_catalog_configured()

    catalog_id = int(body.catalog_id)
    srs = get_srs_from_catalog(catalog_id)

    auth_name = srs["auth_name"]
    auth_srid = srs["auth_srid"]
    if auth_name is None or auth_srid is None:
        msg = gettext("SRS authority attributes must be defined while importing from the catalog.")
        raise ValidationError(msg)

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
        raise ValidationError(gettext("SRS #{} already exists.").format(conflict.id))

    obj.persist()
    DBSession.flush()

    return SRSCatalogImportResponse(id=obj.id)


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
        post=convert,
    )

    config.add_route(
        "spatial_ref_sys.geom_transform.batch",
        "/api/component/spatial_ref_sys/geom_transform",
        post=geom_transform_batch,
    )

    config.add_route(
        "spatial_ref_sys.geom_transform",
        "/api/component/spatial_ref_sys/{id}/geom_transform",
        types=dict(id=int),
        post=geom_transform,
    )

    config.add_route(
        "spatial_ref_sys.geom_length",
        "/api/component/spatial_ref_sys/{id}/geom_length",
        types=dict(id=int),
        post=geom_length_post,
    )

    config.add_route(
        "spatial_ref_sys.geom_area",
        "/api/component/spatial_ref_sys/{id}/geom_area",
        types=dict(id=int),
        post=geom_area_post,
    )

    config.add_route(
        "spatial_ref_sys.item",
        "/api/component/spatial_ref_sys/{id}",
        types=dict(id=int),
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
        types=dict(id=int),
        get=catalog_item,
    )

    config.add_route(
        "spatial_ref_sys.catalog.import",
        "/api/component/spatial_ref_sys/catalog/import",
        post=catalog_import,
    )
