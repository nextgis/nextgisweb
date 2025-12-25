import re
from contextlib import contextmanager
from dataclasses import dataclass
from functools import cached_property, partial
from typing import Annotated, Any, Literal

from msgspec import UNSET, Meta, Struct, UnsetType
from sqlalchemy.exc import NoResultFound

from nextgisweb.env import gettext
from nextgisweb.lib.apitype import AsJSON, Query
from nextgisweb.lib.geometry import Geometry, GeometryNotValid, Transformer, geom_area, geom_length

from nextgisweb.core.exception import ValidationError
from nextgisweb.pyramid import JSONType
from nextgisweb.pyramid.api import csetting
from nextgisweb.resource import DataScope, Resource, ResourceFactory
from nextgisweb.spatial_ref_sys import SRS

from .dtutil import DT_DATATYPES, DT_DUMPERS, DT_LOADERS, DtFormat
from .exception import FeatureNotFound
from .extension import FeatureExtension
from .feature import Feature
from .filter import str_contains_filter
from .interface import (
    FIELD_TYPE,
    IFeatureLayer,
    IFeatureQueryIlike,
    IFeatureQueryLike,
    IFilterableFeatureLayer,
    IVersionableFeatureLayer,
    IWritableFeatureLayer,
)
from .numutil import BIGINT_DUMPERS, BigIntFormat, bigint_loader, int_loader
from .versioning import FVersioningNotEnabled, FVersioningOutOfRange

FeatureID = Annotated[int, Meta(description="Feature ID")]

ParamGeomNull = Annotated[
    bool,
    Meta(description="Write NULL geometries if true, and skip them otherwise"),
]
ParamGeomFormat = Annotated[
    Literal["wkt", "geojson"],
    Meta(description="Geometry serialization format"),
]
ParamDtFormat = Annotated[
    DtFormat,
    Meta(description="Date and time serialization format"),
]
ParamBigIntFormat = Annotated[
    BigIntFormat,
    Meta(description="Big integer serialization format"),
]
ParamSrs = Annotated[int, Meta(gt=0)] | None

csetting("versioning_default", bool | None, default=None)


class LoaderParams(Struct, kw_only=True):
    geom_null: ParamGeomNull = False
    geom_format: ParamGeomFormat = "wkt"
    dt_format: ParamDtFormat = "obj"
    srs: Annotated[ParamSrs, Meta(description="SRS ID of input geometry")] = None


@dataclass
class Loader:
    resource: Resource
    params: LoaderParams

    @cached_property
    def geom_loader(self):
        loader = getattr(Geometry, f"from_{self.params.geom_format}")
        if self.params.srs is not None:
            srs_from = SRS.filter_by(id=self.params.srs).one()
            transformer = Transformer(srs_from.wkt, self.resource.srs.wkt)
            transform = transformer.transform
            return lambda val: transform(loader(val))
        return loader

    @cached_property
    def field_loaders(self):
        result = dict()
        for fld in self.resource.fields:
            fld_datatype = fld.datatype
            if fld_datatype in DT_DATATYPES:
                fld_load = DT_LOADERS[self.params.dt_format][fld_datatype]
            elif fld_datatype == FIELD_TYPE.INTEGER:
                fld_load = int_loader
            elif fld_datatype == FIELD_TYPE.BIGINT:
                fld_load = bigint_loader
            else:
                fld_load = lambda val: val
            result[fld.keyname] = fld_load
        return result

    @cached_property
    def extension_loaders(self):
        return dict()

    def __call__(self, feature: Feature, data: Any):
        feature.geom = UNSET
        if (geom := data.get("geom", UNSET)) is not UNSET:
            if geom is None:
                if self.params.geom_null:
                    feature.geom = None
                else:
                    pass  # Don't update geom with NULL
            else:
                try:
                    feature.geom = self.geom_loader(geom)
                except GeometryNotValid:
                    raise ValidationError(gettext("Geometry is not valid."))

        ftarget = feature.fields
        ftarget.clear()
        if fsource := data.get("fields"):
            loaders = self.field_loaders
            for fkey, fval in fsource.items():
                if loader := loaders.get(fkey):
                    if fval is not None:
                        fval = loader(fval)
                    ftarget[fkey] = fval

    def extensions(self, feature, data):
        updated = False
        if (source := data.get("extensions")) is not None:
            loaders = self.extension_loaders
            for k, v in source.items():
                if (loader := loaders.get(k)) is None:
                    if cls := FeatureExtension.registry.get(k):
                        loaders[k] = loader = cls(feature.layer).deserialize
                    else:
                        continue
                updated = loader(feature, v) or updated
        return updated


class DumperParams(Struct, kw_only=True):
    label: Annotated[bool, Meta(description="Return feature label")] = False
    geom: Annotated[bool, Meta(description="Return feature geometry")] = True
    geom_format: ParamGeomFormat = "wkt"
    dt_format: ParamDtFormat = "obj"
    bigint_format: ParamBigIntFormat = "compat"
    fields: Annotated[
        list[str] | None,
        Meta(description="Field keynames to return, all fields returned by default"),
    ] = None
    extensions: Annotated[
        list[str] | None,
        Meta(description="Extensions to return, all extensions returned by default"),
    ] = None
    srs: Annotated[ParamSrs, Meta(description="SRS ID of output geometry")] = None
    version: Annotated[int, Meta(gt=0)] | None = None
    epoch: Annotated[int, Meta(gt=0)] | None = None


@dataclass
class Dumper:
    resource: Resource
    params: DumperParams

    @cached_property
    def geom_dumper(self):
        if self.params.geom_format == "wkt":
            return lambda val: val.wkt
        elif self.params.geom_format == "geojson":
            return lambda val: val.to_geojson()
        else:
            raise NotImplementedError

    @cached_property
    def field_dumpers(self):
        fields_set = set(f) if ((f := self.params.fields) is not None) else None

        result = dict()
        for fld in self.resource.fields:
            fld_keyname = fld.keyname
            if fields_set is not None and fld_keyname not in fields_set:
                continue

            fld_datatype = fld.datatype
            if fld_datatype in DT_DATATYPES:
                fld_dump = DT_DUMPERS[self.params.dt_format][fld_datatype]
            elif fld_datatype == FIELD_TYPE.BIGINT:
                fld_dump = BIGINT_DUMPERS[self.params.bigint_format]
            else:
                fld_dump = lambda val: val
            result[fld_keyname] = fld_dump
        return result

    @cached_property
    def extension_dumpers(self):
        extensions_set = set(e) if ((e := self.params.extensions) is not None) else None
        if extensions_set is not None and len(extensions_set) == 0:
            return None

        result = dict()
        for identity, cls in FeatureExtension.registry.items():
            if extensions_set is not None and identity not in extensions_set:
                continue
            result[identity] = partial(
                cls(self.resource).serialize,
                version=self.params.version,
            )

        return result

    def feature_query(self):
        query = self.resource.feature_query()
        feature_query_pit(self.resource, query, self.params.version, self.params.epoch)

        fields = list()
        if self.field_dumpers is not None:
            fields.extend(self.field_dumpers.keys())
        if self.params.label and (lf := self.resource.feature_label_field) is not None:
            if lf.keyname not in fields:
                fields.append(lf.keyname)
        query.fields(*fields)

        if self.params.geom:
            query.geom()
            if self.params.geom_format == "wkt":
                query.geom_format("WKT")
            if self.params.srs:
                query.srs(SRS.filter_by(id=self.params.srs).one())

        return query

    def __call__(self, feature: Feature) -> Any:
        result = dict(id=feature.id)

        if (vid := feature.version) is not None:
            result["vid"] = vid

        if self.params.label:
            result["label"] = feature.label

        if self.params.geom:
            geom = feature.geom
            result["geom"] = self.geom_dumper(geom) if geom is not None else None

        if (fdumpers := self.field_dumpers) is not None:
            fsource = feature.fields
            ftarget = result["fields"] = dict()
            for fkey, fdump in fdumpers.items():
                fval = fsource[fkey]
                ftarget[fkey] = fdump(fval) if fval is not None else None

        if (edumpers := self.extension_dumpers) is not None:
            result["extensions"] = {ident: ext(feature) for ident, ext in edumpers.items()}

        return result


def query_feature_or_not_found(query, resource_id, feature_id):
    """Query one feature by id or return FeatureNotFound exception."""

    query.filter_by(id=feature_id)
    query.limit(1)

    for feat in query():
        return feat

    raise FeatureNotFound(resource_id, feature_id)


@contextmanager
def versioning(resource, request):
    if IVersionableFeatureLayer.providedBy(resource) and resource.fversioning:
        with resource.fversioning_context(request) as vobj:
            yield vobj
    else:
        yield None


def feature_query_pit(resource, feature_query, version, epoch):
    if version is None:
        return
    FVersioningNotEnabled.disprove(resource)
    FVersioningOutOfRange.disprove(resource, version)
    feature_query.pit(version)


def iget(
    resource,
    request,
    fid: FeatureID,
    *,
    dumper_params: Annotated[DumperParams, Query(spread=True)],
) -> JSONType:
    """Read feature"""
    request.resource_permission(DataScope.read)

    dumper = Dumper(resource, dumper_params)
    feature = query_feature_or_not_found(dumper.feature_query(), resource.id, fid)
    return dumper(feature)


class FeatureChangeResult(Struct, kw_only=True):
    id: FeatureID
    version: int | UnsetType = UNSET

    def version_from(self, vobj):
        if vobj:
            self.version = vobj.version_id


def iput(
    resource,
    request,
    fid: FeatureID,
    *,
    loader_params: Annotated[LoaderParams, Query(spread=True)],
) -> FeatureChangeResult:
    """Update feature"""
    request.resource_permission(DataScope.write)

    query = resource.feature_query()
    feature = query_feature_or_not_found(query, resource.id, fid)
    loader = Loader(resource, loader_params)

    result = FeatureChangeResult(id=feature.id)
    with versioning(resource, request) as vobj:
        updated = loader.extensions(feature, request.json_body)
        loader(feature, request.json_body)
        if (
            feature.geom is not UNSET or len(feature.fields) > 0
        ) and IWritableFeatureLayer.providedBy(resource):
            updated = resource.feature_put(feature) or updated
        if updated is True:
            result.version_from(vobj)

    return result


def idelete(resource, request, fid: FeatureID) -> FeatureChangeResult:
    """Delete feature"""
    request.resource_permission(DataScope.write)

    with versioning(resource, request) as vobj:
        resource.feature_delete(fid)
        result = FeatureChangeResult(id=fid)
        result.version_from(vobj)

    return result


def get_box_bounds(resource, feature_id, srs_id):
    query = resource.feature_query()
    query.srs(SRS.filter_by(id=srs_id).one())
    query.box()

    feature = query_feature_or_not_found(query, resource.id, feature_id)
    return feature.box.bounds if feature.box else None


def geometry_info(resource, request, fid: FeatureID) -> JSONType:
    """Read feature geometry properties"""
    request.resource_permission(DataScope.read)

    query = resource.feature_query()
    query.geom()

    srs_param = request.GET.get("srs")
    srs_id = int(srs_param) if srs_param is not None else 3857
    try:
        srs = SRS.filter_by(id=srs_id).one()
    except NoResultFound:
        raise ValidationError(
            message=gettext("Unknown spatial reference system"), data={"srs.id": srs_id}
        )
    query.srs(srs)

    feature = query_feature_or_not_found(query, resource.id, fid)

    geom = feature.geom
    if geom is None:
        return None

    geom_type = geom.shape.geom_type

    minX, minY, maxX, maxY = get_box_bounds(resource, fid, srs_id)
    extent = dict(minX=minX, minY=minY, maxX=maxX, maxY=maxY)

    area = abs(geom_area(geom, srs.wkt))
    length = abs(geom_length(geom, srs.wkt))

    if geom_type == "Point":
        area = None
        length = None
    elif geom_type == "LineString" or geom_type == "LinearRing" or geom_type == "MultiLineString":
        area = None

    return dict(type=geom_type, area=area, length=length, extent=extent)


def apply_fields_filter(query, request):
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

        if key != "id":
            try:
                query.layer.field_by_keyname(key)
            except KeyError:
                raise ValidationError(message="Unknown field '%s'." % key)

        filter_.append((key, operator, request.GET[param]))

    if len(filter_) > 0:
        query.filter(*filter_)

    if "like" in request.GET and IFeatureQueryLike.providedBy(query):
        query.like(request.GET["like"])
    elif "ilike" in request.GET and IFeatureQueryIlike.providedBy(query):
        query.ilike(request.GET["ilike"])


def apply_filter_expression(query, resource, filter):
    if not str_contains_filter(filter):
        return

    if not IFilterableFeatureLayer.providedBy(resource):
        return

    filter_parser = resource.filter_parser
    filter_program = filter_parser.parse(filter)
    query.set_filter_program(filter_program)


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
            raise ValidationError(gettext("Parameter 'intersects' geometry is not valid."))
        query.intersects(geom)


def cget(
    resource,
    request,
    *,
    dumper_params: Annotated[DumperParams, Query(spread=True)],
    order_by: str | None = None,
    limit: Annotated[int, Meta(ge=0)] | None = None,
    offset: Annotated[int, Meta(ge=0)] = 0,
    filter: Annotated[str | None, Meta(description="Filter expression (JSON string)")] = None,
) -> JSONType:
    """Read features"""
    request.resource_permission(DataScope.read)

    dumper = Dumper(resource, dumper_params)
    query = dumper.feature_query()

    # Paging
    if limit is not None:
        query.limit(limit, offset)

    apply_fields_filter(query, request)
    apply_intersect_filter(query, request, resource)
    apply_filter_expression(query, resource, filter)

    # Ordering
    order_by_ = []
    if order_by is not None:
        for order_def in list(order_by.split(",")):
            order, colname = re.match(r"^(\-|\+|%2B)?(.*)$", order_def).groups()
            if colname is not None:
                order = ["asc", "desc"][order == "-"]
                order_by_.append([order, colname])

    if order_by_:
        query.order_by(*order_by_)

    return [dumper(feature) for feature in query()]


def cpost(
    resource,
    request,
    *,
    loader_params: Annotated[LoaderParams, Query(spread=True)],
) -> FeatureChangeResult:
    """Create feature"""
    request.resource_permission(DataScope.write)

    loader = Loader(resource, loader_params)
    with versioning(resource, request) as vobj:
        feature = Feature(layer=resource)
        loader(feature, request.json_body)
        feature.id = resource.feature_create(feature)
        loader.extensions(feature, request.json_body)
        result = FeatureChangeResult(id=feature.id)
        result.version_from(vobj)

    return result


def cpatch(
    resource,
    request,
    *,
    loader_params: Annotated[LoaderParams, Query(spread=True)],
) -> AsJSON[list[FeatureChangeResult]]:
    """Update features"""
    request.resource_permission(DataScope.write)

    loader = Loader(resource, loader_params)

    result: list[FeatureChangeResult] = list()
    with versioning(resource, request) as vobj:
        for fdata in request.json_body:
            if "id" not in fdata:
                # Create new feature
                feature = Feature(layer=resource)
                loader(feature, fdata)
                feature.id = resource.feature_create(feature)
                loader.extensions(feature, fdata)
            else:
                # Update existing feature
                query = resource.feature_query()
                feature = query_feature_or_not_found(query, resource.id, fdata["id"])

                have_changes = loader.extensions(feature, fdata)
                if have_changes and vobj:
                    vobj.mark_changed()

                loader(feature, fdata)
                if (
                    feature.geom is not UNSET or len(feature.fields) > 0
                ) and IWritableFeatureLayer.providedBy(resource):
                    resource.feature_put(feature)

            assert isinstance(feature.id, int)
            feature_result = FeatureChangeResult(id=feature.id)
            feature_result.version_from(vobj)
            result.append(feature_result)

    return result


def cdelete(resource, request) -> JSONType:
    """Delete features"""
    request.resource_permission(DataScope.write)

    with versioning(resource, request):
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


def has_filters(request, filter):
    if str_contains_filter(filter):
        return True
    if "intersects" in request.GET:
        return True
    if request.content_type == "application/json" and "intersects" in request.json_body:
        return True
    for param in request.GET.keys():
        if param.startswith("fld_") or param == "id" or param.startswith("id__"):
            return True
        if param in ("like", "ilike"):
            return True
    return False


class CountResponse(Struct, kw_only=True):
    total_count: Annotated[int, Meta(description="Total number of features")]
    filtered_count: Annotated[int | UnsetType, Meta(description="Filtered number of features")] = (
        UNSET
    )


def count(
    resource,
    request,
    *,
    filter: Annotated[str | None, Meta(description="Filter expression (JSON string)")] = None,
) -> CountResponse:
    request.resource_permission(DataScope.read)

    query = resource.feature_query()
    total_count = query().total_count

    result = CountResponse(total_count=total_count)

    if has_filters(request, filter):
        filtered_query = resource.feature_query()
        apply_fields_filter(filtered_query, request)
        apply_intersect_filter(filtered_query, request, resource)
        apply_filter_expression(filtered_query, resource, filter)
        result.filtered_count = filtered_query().total_count

    return result


class NgwExtent(Struct):
    maxLon: float
    minLon: float
    maxLat: float
    minLat: float


class FeatureItemExtent(Struct, kw_only=True):
    extent: NgwExtent | None


def iextent(resource, request, fid: FeatureID) -> FeatureItemExtent:
    """Get feature extent"""
    request.resource_permission(DataScope.read)
    if bounds := get_box_bounds(resource, fid, 4326):
        minLon, minLat, maxLon, maxLat = bounds
        extent = NgwExtent(minLon=minLon, minLat=minLat, maxLon=maxLon, maxLat=maxLat)
    else:
        extent = None
    return FeatureItemExtent(extent=extent)


def cextent(resource, request) -> NgwExtent:
    """Get extent of features"""
    request.resource_permission(DataScope.read)

    query = resource.feature_query()

    apply_fields_filter(query, request)
    apply_intersect_filter(query, request, resource)
    apply_filter_expression(query, resource, request.GET.get("filter"))

    extent = query().extent
    return NgwExtent(**extent)


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
        "feature_layer.feature.geometry_info",
        "/api/resource/{id}/feature/{fid}/geometry_info",
        factory=feature_layer_factory,
        types=dict(fid=FeatureID),
        get=geometry_info,
    )

    croute = config.add_route(
        "feature_layer.feature.collection",
        "/api/resource/{id}/feature/",
        factory=feature_layer_factory,
        get=cget,
    )
    croute.post(cpost, context=IWritableFeatureLayer)
    croute.patch(cpatch, context=IWritableFeatureLayer)
    croute.delete(cdelete, context=IWritableFeatureLayer)

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
        get=cextent,
    )

    config.add_route(
        "feature_layer.feature.item_extent",
        "/api/resource/{id}/feature/{fid}/extent",
        factory=feature_layer_factory,
        types=dict(fid=FeatureID),
        get=iextent,
    )

    from . import api_export, api_identify, api_mvt

    api_export.setup_pyramid(comp, config)
    api_identify.setup_pyramid(comp, config)
    api_mvt.setup_pyramid(comp, config)

    from .transaction import api as transaction_api
    from .versioning import api as versioning_api

    transaction_api.setup_pyramid(comp, config)
    versioning_api.setup_pyramid(comp, config)
