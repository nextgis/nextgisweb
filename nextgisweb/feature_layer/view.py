from pyramid.httpexceptions import HTTPNotFound

from nextgisweb.env import gettext
from nextgisweb.lib.dynmenu import Label, Link

from nextgisweb.pyramid import viewargs
from nextgisweb.resource import DataScope, Resource, Widget, resource_factory
from nextgisweb.resource.extaccess import ExternalAccessLink
from nextgisweb.resource.view import resource_sections

from .extension import FeatureExtension
from .interface import IFeatureLayer, IVersionableFeatureLayer
from .ogrdriver import MVT_DRIVER_EXIST


class FeatureLayerFieldsWidget(Widget):
    interface = IFeatureLayer
    operation = ("update",)
    amdmod = "@nextgisweb/feature-layer/fields-widget"


class SettingsWidget(Widget):
    interface = IFeatureLayer
    operation = ("create", "update")
    amdmod = "@nextgisweb/feature-layer/settings-widget"

    def is_applicable(self) -> bool:
        return IVersionableFeatureLayer.providedBy(self.obj) and super().is_applicable()


@viewargs(renderer="react")
def feature_browse(request):
    request.resource_permission(DataScope.read)

    readonly = not request.context.has_permission(DataScope.write, request.user)

    return dict(
        obj=request.context,
        title=gettext("Feature table"),
        entrypoint="@nextgisweb/feature-layer/feature-grid",
        props=dict(id=request.context.id, readonly=readonly, editOnNewPage=True),
        maxwidth=True,
        maxheight=True,
    )


@viewargs(renderer="react")
def feature_show(request):
    request.resource_permission(DataScope.read)

    feature_id = int(request.matchdict["feature_id"])

    return dict(
        obj=request.context,
        entrypoint="@nextgisweb/feature-layer/feature-display",
        props=dict(resourceId=request.context.id, featureId=feature_id),
        title=gettext("Feature #%d") % feature_id,
        maxheight=True,
        dynmenu=False,
    )


@viewargs(renderer="react")
def feature_update(request):
    request.resource_permission(DataScope.write)

    feature_id = int(request.matchdict["feature_id"])

    return dict(
        obj=request.context,
        entrypoint="@nextgisweb/feature-layer/feature-editor",
        props=dict(resourceId=request.context.id, featureId=feature_id),
        title=gettext("Feature #%d") % feature_id,
        maxheight=True,
        dynmenu=False,
    )


@viewargs(renderer="mako")
def test_mvt(request):
    return dict()


@viewargs(renderer="react")
def export(request):
    if not request.context.has_export_permission(request.user):
        raise HTTPNotFound()
    return dict(
        obj=request.context,
        title=gettext("Save as"),
        props=dict(id=request.context.id),
        entrypoint="@nextgisweb/feature-layer/export-form",
        maxheight=True,
    )


@viewargs(renderer="react")
def export_multiple(request):
    return dict(
        obj=request.context,
        title=gettext("Save as"),
        props=dict(multiple=True, pick=True),
        entrypoint="@nextgisweb/feature-layer/export-form",
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

    config.add_view(
        export,
        route_name="resource.export.page",
        context=IFeatureLayer,
    )

    config.add_route("feature_layer.test_mvt", "/feature_layer/test_mvt").add_view(test_mvt)

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
                icon="material-table",
            )

        if args.obj.has_export_permission(args.request.user):
            yield Link(
                "feature_layer/export",
                gettext("Save as"),
                lambda args: args.request.route_url("resource.export.page", id=args.obj.id),
                icon="material-download",
            )

    @resource_sections(title=gettext("Attributes"))
    def resource_section_fields(obj):
        return IFeatureLayer.providedBy(obj)
