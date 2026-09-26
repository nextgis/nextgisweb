from typing import Literal

from msgspec import Struct

from nextgisweb.env import gettext

from nextgisweb.feature_layer.api import query_feature_or_not_found
from nextgisweb.gui import react_renderer
from nextgisweb.jsrealm import jsentry
from nextgisweb.pyramid import client_setting
from nextgisweb.pyramid.tomb import Configurator, HTTPNotFound, Request
from nextgisweb.resource import DataScope, Widget, resource_factory
from nextgisweb.resource.extaccess import ExternalAccessLink
from nextgisweb.resource.view import resource_sections

from .component import FeatureLayerComponent
from .interface import GEOM_TYPE, IFeatureLayer, IVersionableFeatureLayer
from .ogrdriver import MVT_DRIVER_EXIST, OGR_DRIVER_NAME_2_EXPORT_FORMATS
from .versioning import FVersioningNotEnabled


class FeatureLayerFieldsWidget(Widget):
    interface = IFeatureLayer
    operation = ("create", "update")
    amdmod = jsentry("@nextgisweb/feature-layer/fields-widget")


class SettingsWidget(Widget):
    interface = IFeatureLayer
    operation = ("create", "update")
    amdmod = jsentry("@nextgisweb/feature-layer/settings-widget")

    def is_applicable(self) -> bool:
        return IVersionableFeatureLayer.providedBy(self.obj) and super().is_applicable()


@react_renderer("@nextgisweb/feature-layer/feature-grid")
def feature_browse(context, request: Request):
    request.resource_permission(DataScope.read)

    readonly = not context.has_permission(DataScope.write, request.user)

    return dict(
        obj=context,
        title=gettext("Feature table"),
        props=dict(id=context.id, readonly=readonly, editOnNewPage=True),
        maxwidth=True,
        maxheight=True,
    )


@react_renderer("@nextgisweb/feature-layer/feature-display")
def feature_show(context, request: Request, feature_id: int):
    request.resource_permission(DataScope.read)

    resource_id = context.id
    query_feature_or_not_found(
        context.feature_query(),
        resource_id,
        feature_id,
    )

    return dict(
        obj=context,
        props=dict(resourceId=resource_id, featureId=feature_id),
        title=gettext("Feature #%d") % feature_id,
        maxheight=True,
    )


@react_renderer("@nextgisweb/feature-layer/feature-editor")
def feature_update(context, request: Request, feature_id: int):
    request.resource_permission(DataScope.write)

    resource_id = context.id
    query_feature_or_not_found(context.feature_query(), resource_id, feature_id)

    return dict(
        obj=context,
        props=dict(resourceId=resource_id, featureId=feature_id),
        title=gettext("Feature #%d") % feature_id,
        maxheight=True,
    )


@react_renderer("@nextgisweb/feature-layer/export-form")
def export(context, request: Request):
    if not context.has_export_permission(request.user):
        raise HTTPNotFound()
    return dict(
        obj=context,
        title=gettext("Save as"),
        props=dict(id=context.id),
        maxheight=True,
    )


@react_renderer("@nextgisweb/feature-layer/version-history")
def history(context, request: Request):
    request.resource_permission(DataScope.read)
    if not IVersionableFeatureLayer.providedBy(context) or not context.fversioning:
        raise FVersioningNotEnabled()
    return dict(
        obj=context,
        title=gettext("Version history"),
        props=dict(id=context.id),
        maxwidth=True,
        maxheight=True,
    )


@react_renderer("@nextgisweb/feature-layer/export-form")
def export_multiple(context, request: Request):
    return dict(
        obj=context,
        title=gettext("Save as"),
        props=dict(multiple=True, pick=True),
        maxheight=True,
    )


class MVTLink(ExternalAccessLink):
    title = gettext("MVT Vector Tiles")
    help = gettext(
        "The Mapbox Vector Tile is an efficient encoding for map data into vector tiles that can be rendered dynamically."
    )
    docs_url = "docs_ngweb_dev/doc/developer/misc.html#mvt-vector-tiles"

    interface = IFeatureLayer

    @classmethod
    def is_applicable(cls, obj, request: Request) -> bool:
        return (
            MVT_DRIVER_EXIST
            and super().is_applicable(obj, request)
            and obj.geometry_type != GEOM_TYPE.NONE
        )

    @classmethod
    def url_factory(cls, obj, request: Request) -> str:
        return (
            request.route_url("feature_layer.mvt", _query=dict(resource=obj.id))
            + "&z={z}&x={x}&y={y}"
        )


@resource_sections("@nextgisweb/feature-layer/resource-section")
def resource_section_fields(obj, **kwargs):
    return IFeatureLayer.providedBy(obj)


@react_renderer("@nextgisweb/feature-layer/versioning-settings")
def versioning_settings(request: Request):
    request.require_administrator()
    return dict(
        title=gettext("Feature versioning"),
    )


class FeatureLayerExportFormatClientSetting(Struct, kw_only=True):
    name: str
    display_name: str
    single_file: bool
    lco_configurable: bool | None
    dsco_configurable: str | None
    lonlat: Literal["only", "prefer"] | None


@client_setting("exportFormats")
def cs_export_formats(
    comp: FeatureLayerComponent,
    request: Request,
) -> list[FeatureLayerExportFormatClientSetting]:
    return [FeatureLayerExportFormatClientSetting(**i) for i in OGR_DRIVER_NAME_2_EXPORT_FORMATS]


class FeatureLayerVersioningClientSetting(Struct, kw_only=True):
    default: bool


@client_setting("versioning")
def cs_versioning(
    comp: FeatureLayerComponent, request: Request
) -> FeatureLayerVersioningClientSetting:
    return FeatureLayerVersioningClientSetting(default=comp.versioning_default)


def setup_pyramid(comp: FeatureLayerComponent, config: Configurator):
    config.add_route(
        "feature_layer.export_multiple",
        r"/resource/export_multiple",
        get=export_multiple,
    )

    config.add_route(
        "feature_layer.feature.browse",
        r"/resource/{id:uint}/feature/",
        factory=resource_factory,
    ).get(feature_browse, context=IFeatureLayer)

    config.add_route(
        "feature_layer.feature.show",
        r"/resource/{id:uint}/feature/{feature_id:int}",
        factory=resource_factory,
    ).get(feature_show, context=IFeatureLayer)

    config.add_route(
        "feature_layer.feature.update",
        r"/resource/{id:uint}/feature/{feature_id:int}/update",
        factory=resource_factory,
    ).get(feature_update, context=IFeatureLayer)

    config.add_route(
        "resource.history",
        r"/resource/{id:uint}/history",
        factory=resource_factory,
    ).get(history, context=IFeatureLayer)

    config.add_view(
        export,
        route_name="resource.export.page",
        request_method="GET",
        context=IFeatureLayer,
    )

    config.add_route(
        "feature_layer.control_panel.versioning",
        "/control-panel/versioning",
        get=versioning_settings,
    )
