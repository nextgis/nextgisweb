import re
from contextlib import contextmanager
from dataclasses import dataclass
from functools import cached_property, partial
from typing import Any, List, Literal, Optional

from msgspec import UNSET, Meta, Struct
from sqlalchemy.orm.exc import NoResultFound
from typing_extensions import Annotated

from nextgisweb.env import _
from nextgisweb.lib.apitype import Query
from nextgisweb.lib.geometry import Geometry, GeometryNotValid, Transformer, geom_area, geom_length

from nextgisweb.core.exception import ValidationError
from nextgisweb.pyramid import JSONType
from nextgisweb.resource import DataScope, Resource, ResourceFactory
from nextgisweb.spatial_ref_sys import SRS

from .dtutil import DT_DATATYPES, DT_DUMPERS, DT_LOADERS
from .exception import FeatureNotFound
from .extension import FeatureExtension
from .feature import Feature
from .interface import (
    IFeatureLayer,
    IFeatureQueryIlike,
    IFeatureQueryLike,
    IVersionableFeatureLayer,
    IWritableFeatureLayer,
)
from .versioning import FVersioningNotEnabled, FVersioningOutOfRange

PERM_DATA_READ = DataScope.read
PERM_DATA_WRITE = DataScope.write

FeatureID = Annotated[int, Meta(description="Feature ID")]

ParamGeomFormat = Literal["wkt", "geojson"]
ParamDtFormat = Literal["iso", "obj"]
ParamSrs = Optional[Annotated[int, Meta(gt=0)]]


class LoaderParams(Struct, kw_only=True):
    geom_null: bool = False
    geom_format: ParamGeomFormat = "wkt"
    dt_format: ParamDtFormat = "obj"
    srs: ParamSrs = None


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
            if geom is not None or self.params.geom_null:
                try:
                    feature.geom = self.geom_loader(geom)
                except GeometryNotValid:
                    raise ValidationError(_("Geometry is not valid."))

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
    label: bool = False
    geom: bool = True
    geom_format: ParamGeomFormat = "wkt"
    dt_format: ParamDtFormat = "obj"
    fields: Optional[List[str]] = None
    extensions: Optional[List[str]] = None
    srs: ParamSrs = None
    version: Optional[Annotated[int, Meta(gt=0)]] = None
    epoch: Optional[Annotated[int, Meta(gt=0)]] = None


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
        query.fields(*(self.field_dumpers.keys() if self.field_dumpers is not None else ()))

        if self.params.geom:
            query.geom()
            if self.params.geom_format == "wkt":
                query.geom_format("WKT")
            if self.params.srs:
                query.srs(SRS.filter_by(id=self.params.srs).one())

        return query

    def __call__(self, feature: Feature) -> Any:
        result = dict(id=feature.id)
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
    request.resource_permission(PERM_DATA_READ)

    dumper = Dumper(resource, dumper_params)
    feature = query_feature_or_not_found(dumper.feature_query(), resource.id, fid)
    return dumper(feature)


def iput(
    resource,
    request,
    fid: FeatureID,
    *,
    loader_params: Annotated[LoaderParams, Query(spread=True)],
) -> JSONType:
    """Update feature"""
    request.resource_permission(PERM_DATA_WRITE)

    query = resource.feature_query()
    feature = query_feature_or_not_found(query, resource.id, fid)
    loader = Loader(resource, loader_params)

    vinfo = dict()
    with versioning(resource, request) as vobj:
        updated = loader.extensions(feature, request.json_body)
        loader(feature, request.json_body)
        if (feature.geom or feature.fields) and IWritableFeatureLayer.providedBy(resource):
            updated = resource.feature_put(feature) or updated
        if updated is True and vobj:
            vinfo["version"] = vobj.version_id

    return dict(id=feature.id, **vinfo)


def idelete(resource, request, fid: FeatureID) -> JSONType:
    """Delete feature"""
    request.resource_permission(PERM_DATA_WRITE)

    with versioning(resource, request) as vobj:
        resource.feature_delete(fid)
        result = dict(id=fid)
        if vobj:
            result["version"] = vobj.version_id
        return result


def item_extent(resource, request, fid: FeatureID) -> JSONType:
    request.resource_permission(PERM_DATA_READ)
    extent = get_extent(resource, fid, 4326)
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


def geometry_info(resource, request, fid: FeatureID) -> JSONType:
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

    feature = query_feature_or_not_found(query, resource.id, fid)

    geom = feature.geom
    shape = geom.shape
    geom_type = shape.geom_type

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


def cget(
    resource,
    request,
    *,
    dumper_params: Annotated[DumperParams, Query(spread=True)],
    order_by: Optional[str] = None,
    limit: Optional[Annotated[int, Meta(ge=0)]] = None,
    offset: Annotated[int, Meta(ge=0)] = 0,
) -> JSONType:
    """Read features"""
    request.resource_permission(PERM_DATA_READ)

    dumper = Dumper(resource, dumper_params)
    query = dumper.feature_query()

    # Paging
    if limit is not None:
        query.limit(limit, offset)

    apply_fields_filter(query, request)
    apply_intersect_filter(query, request, resource)

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
) -> JSONType:
    """Create feature"""
    request.resource_permission(PERM_DATA_WRITE)

    loader = Loader(resource, loader_params)
    with versioning(resource, request) as vobj:
        feature = Feature(layer=resource)
        loader(feature, request.json_body)
        feature.id = resource.feature_create(feature)
        loader.extensions(feature, request.json_body)
        vinfo = dict(version=vobj.version_id) if vobj else dict()

    return dict(id=feature.id, **vinfo)


def cpatch(
    resource,
    request,
    *,
    loader_params: Annotated[LoaderParams, Query(spread=True)],
) -> JSONType:
    """Update features"""
    request.resource_permission(PERM_DATA_WRITE)

    loader = Loader(resource, loader_params)

    result = list()
    with versioning(resource, request) as vobj:
        vinfo = dict(version=vobj.version_id) if vobj else dict()
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
                if (feature.geom or feature.fields) and IWritableFeatureLayer.providedBy(resource):
                    resource.feature_put(feature)

            result.append(dict(id=feature.id, **vinfo))

    return result


def cdelete(resource, request) -> JSONType:
    """Delete features"""
    request.resource_permission(PERM_DATA_WRITE)

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


def count(resource, request) -> JSONType:
    request.resource_permission(PERM_DATA_READ)

    query = resource.feature_query()
    total_count = query().total_count

    return dict(total_count=total_count)


def feature_extent(resource, request) -> JSONType:
    request.resource_permission(PERM_DATA_READ)

    query = resource.feature_query()

    apply_fields_filter(query, request)
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

    from .transaction import api as transaction_api
    from .versioning import api as versioning_api

    transaction_api.setup_pyramid(comp, config)
    versioning_api.setup_pyramid(comp, config)
