from datetime import datetime

from pyramid.httpexceptions import HTTPNotFound
from pyramid.response import Response
from shapely.geometry import box

from nextgisweb.lib.geometry import Geometry, Transformer

from nextgisweb.feature_layer.api import deserialize, query_feature_or_not_found, serialize
from nextgisweb.feature_layer.feature import Feature
from nextgisweb.feature_layer.interface import IWritableFeatureLayer
from nextgisweb.pyramid import JSONType
from nextgisweb.resource import DataScope, ResourceFactory, ServiceScope
from nextgisweb.spatial_ref_sys import SRS

from .model import Service

CONFORMANCE = [
    "http://www.opengis.net/spec/ogcapi-common-1/1.0/conf/core",
    "http://www.opengis.net/spec/ogcapi-common-2/1.0/conf/collections",
    "http://www.opengis.net/spec/ogcapi-features-1/1.0/conf/core",
    "http://www.opengis.net/spec/ogcapi-features-1/1.0/conf/geojson",
    "http://www.opengis.net/spec/ogcapi-features-1/1.0/conf/oas30",
    "http://www.opengis.net/spec/ogcapi-features-4/1.0/conf/create-replace-delete",
]


def collection_to_ogc(collection, request):
    extent = collection.resource.extent
    return dict(
        links=[
            {
                "rel": "self",
                "type": "application/json",
                "title": "This document",
                "href": request.route_url(
                    "ogcfserver.collection",
                    id=collection.service.id,
                    collection_id=collection.keyname,
                ),
            },
            {
                "rel": "items",
                "type": "application/geo+json",
                "title": "items as GeoJSON",
                "href": request.route_url(
                    "ogcfserver.items",
                    id=collection.service.id,
                    collection_id=collection.keyname,
                ),
            },
        ],
        id=collection.keyname,
        title=collection.display_name,
        description=collection.resource.description,
        itemType="feature",
        extent={
            "spatial": {
                "bbox": [
                    (
                        extent["minLon"],
                        extent["minLat"],
                        extent["maxLon"],
                        extent["maxLat"],
                    )
                ],
                "crs": "http://www.opengis.net/def/crs/OGC/1.3/CRS84",
            }
        },
    )


def feature_to_ogc(feature):
    result = serialize(feature, geom_format="geojson", dt_format="iso")
    return dict(
        type="Feature",
        geometry=result["geom"],
        properties=result["fields"],
        id=feature.id,
    )


def landing_page(resource, request) -> JSONType:
    """OGC API Features endpoint"""
    request.resource_permission(ServiceScope.connect)

    def route_url(rname):
        return request.route_url(rname, id=resource.id)

    return dict(
        title=resource.display_name,
        description=resource.description,
        links=[
            {
                "rel": "self",
                "type": "application/json",
                "title": "This document",
                "href": route_url("ogcfserver.landing_page"),
            },
            {
                "rel": "conformance",
                "type": "application/json",
                "title": "Conformance",
                "href": route_url("ogcfserver.conformance"),
            },
            {
                "rel": "data",
                "type": "application/json",
                "title": "Collections",
                "href": route_url("ogcfserver.collections"),
            },
            {
                "rel": "service-desc",
                "type": "application/vnd.oai.openapi+json;version=3.0",
                "title": "The OpenAPI definition",
                "href": route_url("ogcfserver.openapi"),
            },
        ],
    )


def conformance(request) -> JSONType:
    request.resource_permission(ServiceScope.connect)
    return dict(conformsTo=CONFORMANCE)


def collections(resource, request) -> JSONType:
    request.resource_permission(ServiceScope.connect)
    collections = [collection_to_ogc(c, request) for c in resource.collections]
    return dict(
        collections=collections,
        links=[
            {
                "rel": "self",
                "type": "application/json",
                "title": "This document",
                "href": request.route_url("ogcfserver.collections", id=resource.id),
            }
        ],
    )


def collection(resource, request) -> JSONType:
    request.resource_permission(ServiceScope.connect)
    collection_id = request.matchdict["collection_id"]
    for c in resource.collections:
        if c.keyname == collection_id:
            return collection_to_ogc(c, request)
    raise HTTPNotFound()


def create(resource, request) -> JSONType:
    request.resource_permission(ServiceScope.connect)
    collection_id = request.matchdict["collection_id"]
    for c in resource.collections:
        if c.keyname == collection_id:
            request.resource_permission(DataScope.write, c.resource)
            feature = Feature(layer=c.resource)
            new_feature = request.json_body.copy()
            new_feature["fields"] = new_feature.pop("properties")
            new_feature["geom"] = new_feature.pop("geometry")
            srs_from = SRS.filter_by(id=int(4326)).one()
            deserialize(
                feature,
                new_feature,
                geom_format="geojson",
                transformer=Transformer(srs_from.wkt, c.resource.srs.wkt),
            )
            if IWritableFeatureLayer.providedBy(c.resource):
                fid = c.resource.feature_create(feature)
    request.response.status_code = 201
    request.response.headers["Location"] = request.route_url(
        "ogcfserver.item",
        id=resource.id,
        collection_id=collection_id,
        item_id=fid,
    )
    return dict(id=fid)


def items(resource, request) -> JSONType:
    request.resource_permission(ServiceScope.connect)
    collection_id = request.matchdict["collection_id"]
    for c in resource.collections:
        if c.keyname == collection_id:
            request.resource_permission(DataScope.read, c.resource)
            limit = (
                int(limit)
                if (limit := request.GET.get("limit", c.maxfeatures)) is not None
                else 10
            )
            offset = int(request.GET.get("offset", 0))
            query = c.resource.feature_query()
            query.srs(SRS.filter_by(id=4326).one())
            query.geom()
            query.limit(limit, offset)

            bbox = request.GET.get("bbox")
            if bbox is not None:
                box_coords = map(float, bbox.split(",")[:4])
                box_geom = Geometry.from_shape(box(*box_coords), srid=4326, validate=False)
                query.intersects(box_geom)

            features = [feature_to_ogc(feature) for feature in query()]

            items = dict(
                type="FeatureCollection",
                features=features,
                timeStamp=datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%S.%fZ"),
                links=[
                    {
                        "rel": "self",
                        "type": "application/json",
                        "title": "This document",
                        "href": request.route_url(
                            "ogcfserver.items",
                            id=resource.id,
                            collection_id=collection_id,
                            _query=request.params,
                        ),
                    },
                    {
                        "rel": "next",
                        "type": "application/geo+json",
                        "title": "items (next)",
                        "href": request.route_url(
                            "ogcfserver.items",
                            id=resource.id,
                            collection_id=collection_id,
                            _query={**request.params, "offset": limit + offset},
                        ),
                    },
                    {
                        "rel": "collection",
                        "type": "application/json",
                        "title": c.display_name,
                        "href": request.route_url(
                            "ogcfserver.collection",
                            id=resource.id,
                            collection_id=collection_id,
                        ),
                    },
                ],
            )
            return items
    return HTTPNotFound()


def iget(resource, request) -> JSONType:
    request.resource_permission(ServiceScope.connect)
    collection_id = request.matchdict["collection_id"]
    item_id = int(request.matchdict["item_id"])
    for c in resource.collections:
        if c.keyname == collection_id:
            request.resource_permission(DataScope.read, c.resource)
            query = c.resource.feature_query()
            query.srs(SRS.filter_by(id=4326).one())
            query.geom()
            feature = query_feature_or_not_found(query, c.resource.id, item_id)
            item = feature_to_ogc(feature)
            item["links"] = [
                {
                    "rel": "self",
                    "type": "application/geo+json",
                    "title": "This document",
                    "href": request.route_url(
                        "ogcfserver.item",
                        id=resource.id,
                        collection_id=collection_id,
                        item_id=item_id,
                    ),
                },
                {
                    "rel": "collection",
                    "type": "application/json",
                    "title": c.display_name,
                    "href": request.route_url(
                        "ogcfserver.collection",
                        id=resource.id,
                        collection_id=collection_id,
                    ),
                },
            ]
            return item
    raise HTTPNotFound()


def iput(resource, request) -> JSONType:
    request.resource_permission(ServiceScope.connect)
    collection_id = request.matchdict["collection_id"]
    item_id = int(request.matchdict["item_id"])
    for c in resource.collections:
        if c.keyname == collection_id:
            request.resource_permission(DataScope.write, c.resource)
            query = c.resource.feature_query()
            query.geom()
            feature = query_feature_or_not_found(query, c.resource.id, item_id)
            new_feature = request.json_body.copy()
            new_feature["fields"] = new_feature.pop("properties")
            new_feature["geom"] = new_feature.pop("geometry")
            srs_from = SRS.filter_by(id=int(4326)).one()
            deserialize(
                feature,
                new_feature,
                geom_format="geojson",
                transformer=Transformer(srs_from.wkt, c.resource.srs.wkt),
            )
            if IWritableFeatureLayer.providedBy(c.resource):
                c.resource.feature_put(feature)
    return dict(id=feature.id)


def idelete(resource, request) -> JSONType:
    request.resource_permission(ServiceScope.connect)
    collection_id = request.matchdict["collection_id"]
    item_id = int(request.matchdict["item_id"])
    for c in resource.collections:
        if c.keyname == collection_id:
            request.resource_permission(DataScope.write, c.resource)
            c.resource.feature_delete(item_id)


def options(resource, request):
    request.resource_permission(ServiceScope.connect)
    collection_id = request.matchdict["collection_id"]
    item_id = request.matchdict.get("item_id")
    allow = []
    for c in resource.collections:
        if c.keyname == collection_id:
            if c.resource.has_permission(DataScope.read, request.user):
                allow.append("GET")
            if c.resource.has_permission(DataScope.write, request.user):
                if item_id is not None:
                    allow.extend(["PUT", "DELETE"])
                else:
                    allow.append("POST")
            break
    return Response(status=200, headers={"Allow": ",".join(allow)})


_PARAM_OFFSET = {
    "name": "offset",
    "in": "query",
    "description": "The optional offset parameter indicates the index within the result set from which "
    "the server shall begin presenting results in the response document. "
    "The first element has an index of 0 (default).",
    "required": False,
    "style": "form",
    "explode": False,
    "schema": {
        "type": "integer",
        "minimum": 0,
        "default": 0,
    },
}

_PARAM_BBOX = {
    "name": "bbox",
    "in": "query",
    "description": "Only features that have a geometry that intersects the bounding box are selected. "
    "The bounding box is provided as four or six numbers, depending on whether "
    "the coordinate reference system includes a vertical axis (height or depth).",
    "required": False,
    "style": "form",
    "explode": False,
    "schema": {"type": "array", "minItems": 4, "maxItems": 6, "items": {"type": "number"}},
}


def openapi(resource, request) -> JSONType:
    request.resource_permission(ServiceScope.connect)

    paths = {}

    oas = {"openapi": "3.0.2", "tags": []}
    info = {"title": resource.display_name, "version": "1.0.0"}
    oas["info"] = info
    oas["servers"] = [
        {
            "url": request.route_url("ogcfserver.landing_page", id=resource.id),
            "description": "Web GIS framework by NextGIS",
        }
    ]

    ogcapi_yaml_url = (
        "http://schemas.opengis.net/ogcapi/features/part1/1.0/openapi/ogcapi-features-1.yaml"
    )

    paths["/"] = {
        "get": {
            "summary": "Landing page",
            "description": "Landing page",
            "operationId": "getLandingPage",
            "parameters": [],
            "responses": {"200": {"$ref": f"{ogcapi_yaml_url}#/components/responses/LandingPage"}},
        }
    }

    paths["/openapi"] = {
        "get": {
            "summary": "API documentation",
            "description": "API documentation",
            "operationId": "getOpenapi",
            "parameters": [],
            "responses": {
                "200": {"$ref": "#/components/responses/200"},
                "default": {"$ref": "#/components/responses/default"},
            },
        }
    }

    paths["/conformance"] = {
        "get": {
            "summary": "API conformance definition",
            "description": "API conformance definition",
            "operationId": "getConformanceDeclaration",
            "parameters": [],
            "responses": {
                "200": {"$ref": f"{ogcapi_yaml_url}#/components/responses/ConformanceDeclaration"}
            },
        }
    }

    paths["/collections"] = {
        "get": {
            "summary": "Collections",
            "description": "Collections",
            "tags": ["server"],
            "operationId": "getCollections",
            "parameters": [],
            "responses": {"200": {"$ref": f"{ogcapi_yaml_url}#/components/responses/Collections"}},
        }
    }

    oas["components"] = {
        "responses": {
            "200": {"description": "successful operation"},
            "default": {"description": "unexpected error"},
        },
        "parameters": {"offset": _PARAM_OFFSET, "bbox": _PARAM_BBOX},
    }

    for c in resource.collections:
        collection_name_path = f"/collections/{c.keyname}"
        items_path = f"{collection_name_path}/items"

        paths[collection_name_path] = {
            "get": {
                "summary": f"Get {c.keyname} metadata",
                "description": c.display_name,
                "operationId": f"describe{c.keyname}Collection",
                "responses": {
                    "200": {"$ref": f"{ogcapi_yaml_url}#/components/responses/Collection"}
                },
            }
        }

        paths[items_path] = {
            "get": {
                "summary": f"Get {c.keyname} items",
                "description": c.display_name,
                "operationId": f"get{c.keyname}Features",
                "parameters": [
                    {"$ref": "#/components/parameters/offset"},
                    {"$ref": "#/components/parameters/bbox"},
                    {"$ref": f"{ogcapi_yaml_url}#/components/parameters/limit"},
                ],
                "responses": {
                    "200": {"$ref": f"{ogcapi_yaml_url}#/components/responses/Features"},
                },
            },
            "post": {
                "summary": f"Add {c.keyname} items",
                "description": c.display_name,
                "operationId": f"add{c.keyname}Features",
                "requestBody": {
                    "description": "Adds item to collection",
                    "content": {"application/geo+json": {"schema": {}}},
                    "required": True,
                },
                "responses": {
                    "201": {"description": "Successful creation"},
                },
            },
        }

        paths[f"{collection_name_path}/items/{{featureId}}"] = {
            "get": {
                "summary": f"Get {c.keyname} item by id",
                "description": c.display_name,
                "operationId": f"get{c.keyname}Feature",
                "parameters": [
                    {"$ref": f"{ogcapi_yaml_url}#/components/parameters/featureId"},
                ],
                "responses": {
                    "200": {"$ref": f"{ogcapi_yaml_url}#/components/responses/Feature"},
                },
            },
            "delete": {
                "summary": f"Delete {c.keyname} items",
                "description": c.display_name,
                "operationId": f"delete{c.keyname}Features",
                "parameters": [
                    {"$ref": f"{ogcapi_yaml_url}#/components/parameters/featureId"},
                ],
                "responses": {"200": {"description": "Successful delete"}},
            },
            "put": {
                "summary": f"Update {c.keyname} items",
                "description": c.display_name,
                "operationId": f"update{c.keyname}Features",
                "parameters": [
                    {"$ref": f"{ogcapi_yaml_url}#/components/parameters/featureId"},
                ],
                "requestBody": {
                    "description": "Updates item in collection",
                    "content": {"application/geo+json": {"schema": {}}},
                    "required": True,
                },
                "responses": {
                    "200": {"description": "Successful update"},
                },
            },
        }

    oas["paths"] = paths

    return oas


def setup_pyramid(comp, config):
    service_factory = ResourceFactory(context=Service)

    config.add_route(
        "ogcfserver.landing_page",
        "/api/resource/{id}/ogcf",
        factory=service_factory,
        get=landing_page,
    )

    config.add_route(
        "ogcfserver.openapi",
        "/api/resource/{id}/ogcf/openapi",
        factory=service_factory,
        openapi=False,
        get=openapi,
    )

    config.add_route(
        "ogcfserver.conformance",
        "/api/resource/{id}/ogcf/conformance",
        factory=service_factory,
        openapi=False,
        get=conformance,
    )

    config.add_route(
        "ogcfserver.collections",
        "/api/resource/{id}/ogcf/collections",
        factory=service_factory,
        openapi=False,
        get=collections,
    )

    config.add_route(
        "ogcfserver.collection",
        "/api/resource/{id}/ogcf/collections/{collection_id:str}",
        factory=service_factory,
        openapi=False,
        get=collection,
    )

    config.add_route(
        "ogcfserver.items",
        "/api/resource/{id}/ogcf/collections/{collection_id:str}/items",
        factory=service_factory,
        openapi=False,
        get=items,
        post=create,
        options=options,
    )

    config.add_route(
        "ogcfserver.item",
        "/api/resource/{id}/ogcf/collections/{collection_id:str}/items/{item_id:int}",
        factory=service_factory,
        openapi=False,
        get=iget,
        put=iput,
        delete=idelete,
        options=options,
    )
