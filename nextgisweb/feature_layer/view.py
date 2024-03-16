from pyramid.httpexceptions import HTTPNotFound

from nextgisweb.env import _
from nextgisweb.lib.dynmenu import Label, Link

from nextgisweb.pyramid import JSONType, viewargs
from nextgisweb.resource import (
    DataScope,
    DataStructureScope,
    Resource,
    ResourceScope,
    Widget,
    resource_factory,
)
from nextgisweb.resource.extaccess import ExternalAccessLink
from nextgisweb.resource.view import resource_sections

from .extension import FeatureExtension
from .interface import IFeatureLayer
from .ogrdriver import MVT_DRIVER_EXIST


class FeatureLayerFieldsWidget(Widget):
    interface = IFeatureLayer
    operation = ("update",)
    amdmod = "ngw-feature-layer/FieldsWidget"


PD_READ = DataScope.read
PD_WRITE = DataScope.write

PDS_R = DataStructureScope.read
PDS_W = DataStructureScope.write

PR_R = ResourceScope.read


@viewargs(renderer="react")
def feature_browse(request):
    request.resource_permission(PD_READ)
    request.resource_permission(PDS_R)

    readonly = not request.context.has_permission(PD_WRITE, request.user)

    return dict(
        obj=request.context,
        title=_("Feature table"),
        entrypoint="@nextgisweb/feature-layer/feature-grid",
        props=dict(id=request.context.id, readonly=readonly, editOnNewPage=True),
        maxwidth=True,
        maxheight=True,
    )


@viewargs(renderer="mako")
def feature_show(request):
    request.resource_permission(PD_READ)
    request.resource_permission(PDS_R)

    feature_id = int(request.matchdict["feature_id"])

    ext_mid = dict()
    for k, ecls in FeatureExtension.registry._dict.items():
        if hasattr(ecls, "display_widget"):
            ext_mid[k] = ecls.display_widget

    return dict(
        obj=request.context,
        title=_("Feature #%d") % feature_id,
        feature_id=feature_id,
        ext_mid=ext_mid,
        dynmenu=False,
    )


@viewargs(renderer="react")
def feature_update(request):
    request.resource_permission(PD_WRITE)

    feature_id = int(request.matchdict["feature_id"])

    return dict(
        obj=request.context,
        entrypoint="@nextgisweb/feature-layer/feature-editor",
        props=dict(resourceId=request.context.id, featureId=feature_id),
        title=_("Feature #%d") % feature_id,
        maxheight=True,
        dynmenu=False,
    )


def field_collection(request) -> JSONType:
    request.resource_permission(PDS_R)
    return [f.to_dict() for f in request.context.fields]


@viewargs(renderer="mako")
def test_mvt(request):
    return dict()


@viewargs(renderer="react")
def export(request):
    if not request.context.has_export_permission(request.user):
        raise HTTPNotFound()
    return dict(
        obj=request.context,
        title=_("Save as"),
        props=dict(id=request.context.id),
        entrypoint="@nextgisweb/feature-layer/export-form",
        maxheight=True,
    )


@viewargs(renderer="react")
def export_multiple(request):
    return dict(
        obj=request.context,
        title=_("Save as"),
        props=dict(multiple=True, pick=True),
        entrypoint="@nextgisweb/feature-layer/export-form",
        maxheight=True,
    )


class MVTLink(ExternalAccessLink):
    title = _("MVT Vector Tiles")
    help = _(
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

    config.add_route(
        "feature_layer.field",
        r"/resource/{id:uint}/field/",
        factory=resource_factory,
    ).add_view(field_collection, context=IFeatureLayer)

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

        yield Label("feature_layer", _("Features"))

        if args.obj.has_permission(PD_READ, args.request.user):
            if args.obj.has_permission(PDS_R, args.request.user):
                yield Link(
                    "feature_layer/feature-browse",
                    _("Table"),
                    lambda args: args.request.route_url(
                        "feature_layer.feature.browse", id=args.obj.id
                    ),
                    important=True,
                    icon="mdi-table-large",
                )

        if args.obj.has_export_permission(args.request.user):
            yield Link(
                "feature_layer/export",
                _("Save as"),
                lambda args: args.request.route_url("resource.export.page", id=args.obj.id),
                icon="material-save_alt",
            )

    @resource_sections(title=_("Attributes"))
    def resource_section_fields(obj):
        return IFeatureLayer.providedBy(obj)
