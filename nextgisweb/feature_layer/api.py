import re
from datetime import date, datetime, time

from msgspec import Meta
from sqlalchemy.orm.exc import NoResultFound
from typing_extensions import Annotated

from nextgisweb.env import _
from nextgisweb.lib.geometry import Geometry, GeometryNotValid, Transformer, geom_area, geom_length

from nextgisweb.core.exception import ValidationError
from nextgisweb.pyramid import JSONType
from nextgisweb.resource import DataScope, ResourceFactory
from nextgisweb.spatial_ref_sys import SRS

from .exception import FeatureNotFound
from .extension import FeatureExtension
from .feature import Feature
from .interface import (
    FIELD_TYPE,
    IFeatureLayer,
    IFeatureQueryIlike,
    IFeatureQueryLike,
    IWritableFeatureLayer,
)

PERM_DATA_READ = DataScope.read
PERM_DATA_WRITE = DataScope.write

FeatureID = Annotated[int, Meta(description="Feature ID")]


def _extensions(extensions, layer):
    result = []

    ext_filter = None if extensions is None else extensions.split(",")

    for identity, cls in FeatureExtension.registry.items():
        if ext_filter is None or identity in ext_filter:
            result.append((identity, cls(layer)))

    return result


def deserialize(feat, data, geom_format="wkt", dt_format="obj", transformer=None, create=False):
    if "geom" in data:
        try:
            if geom_format == "wkt":
                feat.geom = Geometry.from_wkt(data["geom"])
            elif geom_format == "geojson":
                feat.geom = Geometry.from_geojson(data["geom"])
            else:
                raise ValidationError(_("Geometry format '%s' is not supported.") % geom_format)
        except GeometryNotValid:
            raise ValidationError(_("Geometry is not valid."))

        if transformer is not None:
            feat.geom = transformer.transform(feat.geom)

    if dt_format not in ("obj", "iso"):
        raise ValidationError(_("Date format '%s' is not supported.") % dt_format)

    if "fields" in data:
        fdata = data["fields"]

        for fld in feat.layer.fields:
            if fld.keyname in fdata:
                val = fdata.get(fld.keyname)

                if val is None:
                    fval = None

                elif fld.datatype == FIELD_TYPE.DATE:
                    if dt_format == "iso":
                        fval = date.fromisoformat(val)
                    else:
                        fval = date(int(val["year"]), int(val["month"]), int(val["day"]))

                elif fld.datatype == FIELD_TYPE.TIME:
                    if dt_format == "iso":
                        fval = time.fromisoformat(val)
                    else:
                        fval = time(int(val["hour"]), int(val["minute"]), int(val["second"]))

                elif fld.datatype == FIELD_TYPE.DATETIME:
                    if dt_format == "iso":
                        fval = datetime.fromisoformat(val)
                    else:
                        fval = datetime(
                            int(val["year"]),
                            int(val["month"]),
                            int(val["day"]),
                            int(val["hour"]),
                            int(val["minute"]),
                            int(val["second"]),
                        )

                else:
                    fval = val

                feat.fields[fld.keyname] = fval

    if create:
        feat.id = feat.layer.feature_create(feat)

    if "extensions" in data:
        for identity, cls in FeatureExtension.registry.items():
            if identity in data["extensions"]:
                ext = cls(feat.layer)
                ext.deserialize(feat, data["extensions"][identity])


def serialize(feat, keys=None, geom_format="wkt", dt_format="obj", label=False, extensions=[]):
    result = dict(id=feat.id)

    if label:
        result["label"] = feat.label

    if feat.geom is not None:
        if geom_format == "wkt":
            geom = feat.geom.wkt
        elif geom_format == "geojson":
            geom = feat.geom.to_geojson()
        else:
            raise ValidationError(_("Geometry format '%s' is not supported.") % geom_format)

        result["geom"] = geom

    if dt_format not in ("obj", "iso"):
        raise ValidationError(_("Date format '%s' is not supported.") % dt_format)

    result["fields"] = dict()
    for fld in feat.layer.fields:
        if keys is not None and fld.keyname not in keys:
            continue

        val = feat.fields.get(fld.keyname)

        if val is None:
            fval = None

        elif fld.datatype in (FIELD_TYPE.DATE, FIELD_TYPE.TIME, FIELD_TYPE.DATETIME):
            if dt_format == "iso":
                fval = val.isoformat()
            else:
                if fld.datatype == FIELD_TYPE.DATE:
                    fval = dict((("year", val.year), ("month", val.month), ("day", val.day)))

                elif fld.datatype == FIELD_TYPE.TIME:
                    fval = dict(
                        (("hour", val.hour), ("minute", val.minute), ("second", val.second))
                    )

                elif fld.datatype == FIELD_TYPE.DATETIME:
                    fval = dict(
                        (
                            ("year", val.year),
                            ("month", val.month),
                            ("day", val.day),
                            ("hour", val.hour),
                            ("minute", val.minute),
                            ("second", val.second),
                        )
                    )

        else:
            fval = val

        result["fields"][fld.keyname] = fval

    result["extensions"] = dict()
    for identity, ext in extensions:
        result["extensions"][identity] = ext.serialize(feat)

    return result


def query_feature_or_not_found(query, resource_id, feature_id):
    """Query one feature by id or return FeatureNotFound exception."""

    query.filter_by(id=feature_id)
    query.limit(1)

    for feat in query():
        return feat

    raise FeatureNotFound(resource_id, feature_id)


def iget(resource, request) -> JSONType:
    request.resource_permission(PERM_DATA_READ)

    geom_skip = request.GET.get("geom", "yes").lower() == "no"
    srs = request.GET.get("srs")

    srlz_params = dict(
        geom_format=request.GET.get("geom_format", "wkt").lower(),
        dt_format=request.GET.get("dt_format", "obj"),
        extensions=_extensions(request.GET.get("extensions"), resource),
    )

    query = resource.feature_query()
    if not geom_skip:
        if srs is not None:
            query.srs(SRS.filter_by(id=int(srs)).one())
        query.geom()
        if srlz_params["geom_format"] == "wkt":
            query.geom_format("WKT")

    feature = query_feature_or_not_found(query, resource.id, int(request.matchdict["fid"]))

    result = serialize(feature, **srlz_params)

    return result


def item_extent(resource, request) -> JSONType:
    request.resource_permission(PERM_DATA_READ)
    feature_id = int(request.matchdict["fid"])
    extent = get_extent(resource, feature_id, 4326)
    return dict(extent=extent)


def get_box_bounds(resource, feature_id, srs_id):
    query = resource.feature_query()
    query.srs(SRS.filter_by(id=srs_id).one())
    query.box()

    feature = query_feature_or_not_found(query, resource.id, feature_id)
    return feature.box.bounds


def get_extent(resource, feature_id, srs):
    minLon, minLat, maxLon, maxLat = get_box_bounds(resource, feature_id, srs)
    return dict(minLon=minLon, minLat=minLat, maxLon=maxLon, maxLat=maxLat)


def geometry_info(resource, request) -> JSONType:
    request.resource_permission(PERM_DATA_READ)

    query = resource.feature_query()
    query.geom()
    query.geom_format("WKT")

    srs_param = request.GET.get("srs")
    srs_id = int(srs_param) if srs_param is not None else 3857
    try:
        srs = SRS.filter_by(id=srs_id).one()
    except NoResultFound:
        raise ValidationError(
            message=_("Unknown spatial reference system"), data={"srs.id": srs_id}
        )
    query.srs(srs)

    feature_id = int(request.matchdict["fid"])
    feature = query_feature_or_not_found(query, resource.id, feature_id)

    geom = feature.geom
    shape = geom.shape
    geom_type = shape.geom_type

    minX, minY, maxX, maxY = get_box_bounds(resource, feature_id, srs_id)
    extent = dict(minX=minX, minY=minY, maxX=maxX, maxY=maxY)

    area = abs(geom_area(geom, srs.wkt))
    length = abs(geom_length(geom, srs.wkt))

    if geom_type == "Point":
        area = None
        length = None
    elif geom_type == "LineString" or geom_type == "LinearRing" or geom_type == "MultiLineString":
        area = None

    return dict(type=geom_type, area=area, length=length, extent=extent)


def iput(resource, request) -> JSONType:
    request.resource_permission(PERM_DATA_WRITE)

    query = resource.feature_query()
    query.geom()

    feature = query_feature_or_not_found(query, resource.id, int(request.matchdict["fid"]))

    dsrlz_params = dict(
        geom_format=request.GET.get("geom_format", "wkt").lower(),
        dt_format=request.GET.get("dt_format", "obj"),
    )

    srs = request.GET.get("srs")

    if srs is not None:
        srs_from = SRS.filter_by(id=int(srs)).one()
        dsrlz_params["transformer"] = Transformer(srs_from.wkt, resource.srs.wkt)

    deserialize(feature, request.json_body, **dsrlz_params)
    if IWritableFeatureLayer.providedBy(resource):
        resource.feature_put(feature)

    return dict(id=feature.id)


def idelete(resource, request) -> JSONType:
    request.resource_permission(PERM_DATA_WRITE)

    fid = int(request.matchdict["fid"])
    resource.feature_delete(fid)


def apply_attr_filter(query, request, keynames):
    # Fields filters
    filter_ = []
    for param in request.GET.keys():
        if param.startswith("fld_"):
            fld_expr = re.sub("^fld_", "", param)
        elif param == "id" or param.startswith("id__"):
            fld_expr = param
        else:
            continue

        try:
            key, operator = fld_expr.rsplit("__", 1)
        except ValueError:
            key, operator = (fld_expr, "eq")

        if key != "id" and key not in keynames:
            raise ValidationError(message="Unknown field '%s'." % key)

        filter_.append((key, operator, request.GET[param]))

    if len(filter_) > 0:
        query.filter(*filter_)

    if "like" in request.GET and IFeatureQueryLike.providedBy(query):
        query.like(request.GET["like"])
    elif "ilike" in request.GET and IFeatureQueryIlike.providedBy(query):
        query.ilike(request.GET["ilike"])


def apply_intersect_filter(query, request, resource):
    # Filtering by extent
    if "intersects" in request.GET:
        wkt_intersects = request.GET["intersects"]
    # Workaround to pass huge geometry for intersection filter
    elif request.content_type == "application/json" and "intersects" in (
        json_body := request.json_body
    ):
        wkt_intersects = json_body["intersects"]
    else:
        wkt_intersects = None

    if wkt_intersects is not None:
        try:
            geom = Geometry.from_wkt(wkt_intersects, srid=resource.srs.id)
        except GeometryNotValid:
            raise ValidationError(_("Parameter 'intersects' geometry is not valid."))
        query.intersects(geom)


def cget(resource, request) -> JSONType:
    request.resource_permission(PERM_DATA_READ)

    geom_skip = request.GET.get("geom", "yes") == "no"
    srs = request.GET.get("srs")

    srlz_params = dict(
        geom_format=request.GET.get("geom_format", "wkt").lower(),
        dt_format=request.GET.get("dt_format", "obj"),
        label=request.GET.get("label", False),
        extensions=_extensions(request.GET.get("extensions"), resource),
    )

    keys = [fld.keyname for fld in resource.fields]
    query = resource.feature_query()

    # Paging
    limit = request.GET.get("limit")
    offset = request.GET.get("offset", 0)
    if limit is not None:
        query.limit(int(limit), int(offset))

    apply_attr_filter(query, request, keys)

    # Ordering
    order_by = request.GET.get("order_by")
    order_by_ = []
    if order_by is not None:
        for order_def in list(order_by.split(",")):
            order, colname = re.match(r"^(\-|\+|%2B)?(.*)$", order_def).groups()
            if colname is not None:
                order = ["asc", "desc"][order == "-"]
                order_by_.append([order, colname])

    if order_by_:
        query.order_by(*order_by_)

    apply_intersect_filter(query, request, resource)

    # Selected fields
    fields = request.GET.get("fields")
    if fields is not None:
        field_list = fields.split(",")
        fields = [key for key in keys if key in field_list]

    if fields:
        srlz_params["keys"] = fields
        query.fields(*fields)

    if not geom_skip:
        if srs is not None:
            query.srs(SRS.filter_by(id=int(srs)).one())
        query.geom()
        if srlz_params["geom_format"] == "wkt":
            query.geom_format("WKT")

    result = [serialize(feature, **srlz_params) for feature in query()]

    return result


def cpost(resource, request) -> JSONType:
    request.resource_permission(PERM_DATA_WRITE)

    dsrlz_params = dict(
        geom_format=request.GET.get("geom_format", "wkt").lower(),
        dt_format=request.GET.get("dt_format", "obj"),
    )

    srs = request.GET.get("srs")

    if srs is not None:
        srs_from = SRS.filter_by(id=int(srs)).one()
        dsrlz_params["transformer"] = Transformer(srs_from.wkt, resource.srs.wkt)

    feature = Feature(layer=resource)
    deserialize(feature, request.json_body, create=True, **dsrlz_params)

    return dict(id=feature.id)


def cpatch(resource, request) -> JSONType:
    request.resource_permission(PERM_DATA_WRITE)
    result = list()

    dsrlz_params = dict(
        geom_format=request.GET.get("geom_format", "wkt").lower(),
        dt_format=request.GET.get("dt_format", "obj"),
    )

    srs = request.GET.get("srs")

    if srs is not None:
        srs_from = SRS.filter_by(id=int(srs)).one()
        dsrlz_params["transformer"] = Transformer(srs_from.wkt, resource.srs.wkt)

    for fdata in request.json_body:
        if "id" not in fdata:
            # Create new feature
            feature = Feature(layer=resource)
            deserialize(feature, fdata, create=True, **dsrlz_params)
        else:
            # Update existing feature
            query = resource.feature_query()
            query.geom()
            query.filter_by(id=fdata["id"])
            query.limit(1)

            feature = None
            for f in query():
                feature = f

            deserialize(feature, fdata, **dsrlz_params)
            resource.feature_put(feature)

        result.append(dict(id=feature.id))

    return result


def cdelete(resource, request) -> JSONType:
    request.resource_permission(PERM_DATA_WRITE)

    if len(request.body) > 0:
        result = []
        for fdata in request.json_body:
            if "id" in fdata:
                fid = fdata["id"]
                resource.feature_delete(fid)
                result.append(fid)
    else:
        resource.feature_delete_all()
        result = True

    return result


def count(resource, request) -> JSONType:
    request.resource_permission(PERM_DATA_READ)

    query = resource.feature_query()
    total_count = query().total_count

    return dict(total_count=total_count)


def feature_extent(resource, request) -> JSONType:
    request.resource_permission(PERM_DATA_READ)

    supported_ident = ["vector_layer", "postgis_layer"]
    if resource.identity not in supported_ident:
        raise ValidationError(
            "feature_layer.feature.extent can only be applied to vector and postgis layers"
        )

    keys = [fld.keyname for fld in resource.fields]
    query = resource.feature_query()

    apply_attr_filter(query, request, keys)
    apply_intersect_filter(query, request, resource)

    extent = query().extent
    return dict(extent=extent)


def setup_pyramid(comp, config):
    feature_layer_factory = ResourceFactory(context=IFeatureLayer)

    config.add_route(
        "feature_layer.feature.item",
        "/api/resource/{id}/feature/{fid}",
        factory=feature_layer_factory,
        types=dict(fid=FeatureID),
        get=iget,
        put=iput,
    ).delete(idelete, context=IWritableFeatureLayer)

    config.add_route(
        "feature_layer.feature.item_extent",
        "/api/resource/{id}/feature/{fid}/extent",
        factory=feature_layer_factory,
        types=dict(fid=FeatureID),
        get=item_extent,
    )

    config.add_route(
        "feature_layer.feature.geometry_info",
        "/api/resource/{id}/feature/{fid}/geometry_info",
        factory=feature_layer_factory,
        types=dict(fid=FeatureID),
        get=geometry_info,
    )

    config.add_route(
        "feature_layer.feature.collection",
        "/api/resource/{id}/feature/",
        factory=feature_layer_factory,
        get=cget,
    ).post(cpost, context=IWritableFeatureLayer).patch(
        cpatch, context=IWritableFeatureLayer
    ).delete(
        cdelete, context=IWritableFeatureLayer
    )

    config.add_route(
        "feature_layer.feature.count",
        "/api/resource/{id}/feature_count",
        factory=feature_layer_factory,
        get=count,
    )

    config.add_route(
        "feature_layer.feature.extent",
        "/api/resource/{id}/feature_extent",
        factory=feature_layer_factory,
        get=feature_extent,
    )

    from . import api_export, api_identify, api_mvt

    api_export.setup_pyramid(comp, config)
    api_identify.setup_pyramid(comp, config)
    api_mvt.setup_pyramid(comp, config)
