from nextgisweb.env import gettext
from nextgisweb.lib.dynmenu import Link

from nextgisweb.basemap.model import BasemapLayer
from nextgisweb.feature_layer import IFeatureLayer
from nextgisweb.gui import react_renderer
from nextgisweb.jsrealm import icon
from nextgisweb.raster_layer import RasterLayer
from nextgisweb.render import IRenderableStyle
from nextgisweb.resource import DataScope, Resource, resource_factory
from nextgisweb.resource.attr.api import ResourceAttrRequestContext

from .attr import LayerPreviewAttrAvailable


@react_renderer("@nextgisweb/layer-preview/preview-layer")
def preview_map(request):
    request.resource_permission(DataScope.read)
    resource = request.context

    return dict(
        obj=resource,
        props=dict(resourceId=resource.id),
        title=gettext("Preview"),
    )


def setup_pyramid(comp, config):
    config.add_route(
        "layer_preview.map",
        r"/resource/{id:uint}/preview",
        factory=resource_factory,
    ).add_view(
        preview_map,
        context=IFeatureLayer,
    ).add_view(
        preview_map,
        context=IRenderableStyle,
    ).add_view(
        preview_map,
        context=RasterLayer,
    ).add_view(
        preview_map,
        context=BasemapLayer,
    )

    icon_preview = icon("material/preview")

    @Resource.__dynmenu__.add
    def _resource_dynmenu(args):
        ctx = ResourceAttrRequestContext(request=args.request)
        attr = LayerPreviewAttrAvailable()

        if attr(args.obj, ctx=ctx):
            yield Link(
                "extra/preview",
                gettext("Preview"),
                lambda args: args.request.route_url("layer_preview.map", id=args.obj.id),
                important=True,
                icon=icon_preview,
            )
