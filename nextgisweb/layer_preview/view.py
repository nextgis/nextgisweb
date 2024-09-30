from nextgisweb.env import gettext
from nextgisweb.lib.dynmenu import Link

from nextgisweb.basemap.model import BasemapLayer
from nextgisweb.feature_layer import IFeatureLayer
from nextgisweb.pyramid import viewargs
from nextgisweb.raster_layer import RasterLayer
from nextgisweb.render import IRenderableStyle
from nextgisweb.resource import DataScope, Resource, resource_factory


@viewargs(renderer="react")
def preview_map(resource, request):
    request.resource_permission(DataScope.read)

    return dict(
        obj=resource,
        entrypoint="@nextgisweb/layer-preview/preview-layer",
        props=dict(
        resource_id=resource.id),
        title=gettext("Preview"),
    )


def setup_pyramid(comp, config):
    config.add_route(
        "layer_preview.map",
        r"/resource/{id:uint}/preview",
        factory=resource_factory,
    ).add_view(preview_map, context=IFeatureLayer).add_view(
        preview_map, context=IRenderableStyle
    ).add_view(
        preview_map, context=RasterLayer
    ).add_view(preview_map, context=BasemapLayer)

    @Resource.__dynmenu__.add
    def _resource_dynmenu(args):
        if (
            IFeatureLayer.providedBy(args.obj)
            or IRenderableStyle.providedBy(args.obj)
            or (isinstance(args.obj, RasterLayer) and args.obj.cog)
            or (isinstance(args.obj, BasemapLayer))
        ) and (args.obj.has_permission(DataScope.read, args.request.user)):
            yield Link(
                "extra/preview",
                gettext("Preview"),
                lambda args: args.request.route_url("layer_preview.map", id=args.obj.id),
                important=True,
                icon="material-preview",
            )
