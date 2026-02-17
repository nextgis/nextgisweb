from msgspec import Struct
from pyramid.httpexceptions import HTTPNotFound

from nextgisweb.env import gettext
from nextgisweb.lib.dynmenu import Label, Link

from nextgisweb.feature_layer.api import query_feature_or_not_found
from nextgisweb.gui import react_renderer
from nextgisweb.jsrealm import icon, jsentry
from nextgisweb.pyramid import client_setting
from nextgisweb.resource import DataScope, Resource, Widget, resource_factory
from nextgisweb.resource.extaccess import ExternalAccessLink
from nextgisweb.resource.view import resource_sections

from .component import FeatureLayerComponent
from .interface import IFeatureLayer, IVersionableFeatureLayer
from .ogrdriver import MVT_DRIVER_EXIST, OGR_DRIVER_NAME_2_EXPORT_FORMATS
from .versioning import FVersioningNotEnabled


class FeatureLayerFieldsWidget(Widget):
    interface = IFeatureLayer
    operation = ("update",)
    amdmod = jsentry("@nextgisweb/feature-layer/fields-widget")


class SettingsWidget(Widget):
    interface = IFeatureLayer
    operation = ("create", "update")
    amdmod = jsentry("@nextgisweb/feature-layer/settings-widget")

    def is_applicable(self) -> bool:
        return IVersionableFeatureLayer.providedBy(self.obj) and super().is_applicable()


@react_renderer("@nextgisweb/feature-layer/feature-grid")
def feature_browse(request):
    request.resource_permission(DataScope.read)

    readonly = not request.context.has_permission(DataScope.write, request.user)

    return dict(
        obj=request.context,
        title=gettext("Feature table"),
        props=dict(id=request.context.id, readonly=readonly, editOnNewPage=True),
        maxwidth=True,
        maxheight=True,
    )


@react_renderer("@nextgisweb/feature-layer/feature-display")
def feature_show(request):
    request.resource_permission(DataScope.read)

    resource_id = request.context.id
    feature_id = int(request.matchdict["feature_id"])
    query_feature_or_not_found(request.context.feature_query(), resource_id, feature_id)

    return dict(
        obj=request.context,
        props=dict(resourceId=resource_id, featureId=feature_id),
        title=gettext("Feature #%d") % feature_id,
        maxheight=True,
        dynmenu=False,
    )


@react_renderer("@nextgisweb/feature-layer/feature-editor")
def feature_update(request):
    request.resource_permission(DataScope.write)

    resource_id = request.context.id
    feature_id = int(request.matchdict["feature_id"])
    query_feature_or_not_found(request.context.feature_query(), resource_id, feature_id)

    return dict(
        obj=request.context,
        props=dict(resourceId=resource_id, featureId=feature_id),
        title=gettext("Feature #%d") % feature_id,
        maxheight=True,
        dynmenu=False,
    )


@react_renderer("@nextgisweb/feature-layer/export-form")
def export(request):
    if not request.context.has_export_permission(request.user):
        raise HTTPNotFound()
    return dict(
        obj=request.context,
        title=gettext("Save as"),
        props=dict(id=request.context.id),
        maxheight=True,
    )


@react_renderer("@nextgisweb/feature-layer/version-history")
def history(request):
    request.resource_permission(DataScope.read)
    if not IVersionableFeatureLayer.providedBy(request.context) or not request.context.fversioning:
        raise FVersioningNotEnabled()
    return dict(
        obj=request.context,
        title=gettext("Version history"),
        props=dict(id=request.context.id),
        maxwidth=True,
        maxheight=True,
    )


@react_renderer("@nextgisweb/feature-layer/export-form")
def export_multiple(request):
    return dict(
        obj=request.context,
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
    def is_applicable(cls, obj, request) -> bool:
        return MVT_DRIVER_EXIST and super().is_applicable(obj, request)

    @classmethod
    def url_factory(cls, obj, request) -> str:
        return (
            request.route_url("feature_layer.mvt", _query=dict(resource=obj.id))
            + "&z={z}&x={x}&y={y}"
        )


@resource_sections("@nextgisweb/feature-layer/resource-section")
def resource_section_fields(obj, **kwargs):
    return IFeatureLayer.providedBy(obj)


@react_renderer("@nextgisweb/feature-layer/versioning-settings")
def versioning_settings(request):
    request.require_administrator()
    return dict(
        title=gettext("Feature versioning"),
        dynmenu=request.env.pyramid.control_panel,
    )


class FeatureLayerExportFormatClientSetting(Struct, kw_only=True):
    name: str
    display_name: str
    single_file: bool
    lco_configurable: bool | None
    dsco_configurable: str | None


@client_setting("exportFormats")
def cs_export_formats(
    comp: FeatureLayerComponent, request
) -> list[FeatureLayerExportFormatClientSetting]:
    return [FeatureLayerExportFormatClientSetting(**i) for i in OGR_DRIVER_NAME_2_EXPORT_FORMATS]


class FeatureLayerVersioningClientSetting(Struct, kw_only=True):
    default: bool


@client_setting("versioning")
def cs_versioning(comp: FeatureLayerComponent, request) -> FeatureLayerVersioningClientSetting:
    return FeatureLayerVersioningClientSetting(default=comp.versioning_default)


def setup_pyramid(comp, config):
    config.add_route(
        "feature_layer.export_multiple",
        r"/resource/export_multiple",
    ).add_view(export_multiple)

    config.add_route(
        "feature_layer.feature.browse",
        r"/resource/{id:uint}/feature/",
        factory=resource_factory,
    ).add_view(feature_browse)

    config.add_route(
        "feature_layer.feature.show",
        r"/resource/{id:uint}/feature/{feature_id:int}",
        factory=resource_factory,
    ).add_view(feature_show, context=IFeatureLayer)

    config.add_route(
        "feature_layer.feature.update",
        r"/resource/{id:uint}/feature/{feature_id:int}/update",
        factory=resource_factory,
    ).add_view(feature_update, context=IFeatureLayer)

    config.add_route(
        "resource.history",
        r"/resource/{id:uint}/history",
        factory=resource_factory,
    ).add_view(
        history,
        context=IFeatureLayer,
    )

    config.add_view(
        export,
        route_name="resource.export.page",
        context=IFeatureLayer,
    )

    icon_feature_browse = icon("material/table")
    icon_history = icon("material/history")
    icon_export = icon("material/download")

    # Layer menu extension
    @Resource.__dynmenu__.add
    def _resource_dynmenu(args):
        if not IFeatureLayer.providedBy(args.obj):
            return

        yield Label("feature_layer", gettext("Features"))

        if args.obj.has_permission(DataScope.read, args.request.user):
            yield Link(
                "feature_layer/feature-browse",
                gettext("Table"),
                lambda args: args.request.route_url(
                    "feature_layer.feature.browse", id=args.obj.id
                ),
                important=True,
                icon=icon_feature_browse,
            )
            if IVersionableFeatureLayer.providedBy(args.obj) and args.obj.fversioning:
                yield Link(
                    "feature_layer/history",
                    gettext("Version history"),
                    lambda args: args.request.route_url("resource.history", id=args.obj.id),
                    icon=icon_history,
                )

        if args.obj.has_export_permission(args.request.user):
            yield Link(
                "feature_layer/export",
                gettext("Save as"),
                lambda args: args.request.route_url("resource.export.page", id=args.obj.id),
                icon=icon_export,
            )

    config.add_route(
        "feature_layer.control_panel.versioning",
        "/control-panel/versioning",
        get=versioning_settings,
    )

    @comp.env.pyramid.control_panel.add
    def _control_panel(args):
        if args.request.user.is_administrator:
            yield Link(
                "settings.versioning",
                gettext("Feature versioning"),
                lambda args: args.request.route_url("feature_layer.control_panel.versioning"),
            )
