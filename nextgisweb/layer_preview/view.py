from nextgisweb.env import _
from nextgisweb.lib.dynmenu import Link

from nextgisweb.feature_layer import IFeatureLayer
from nextgisweb.layer.interface import IBboxLayer
from nextgisweb.pyramid import viewargs
from nextgisweb.raster_layer import RasterLayer
from nextgisweb.render import IRenderableStyle
from nextgisweb.resource import DataScope, Resource, ResourceScope, resource_factory


@viewargs(renderer="preview.mako")
def preview_map(resource, request):
    request.resource_permission(DataScope.read)

    if IFeatureLayer.providedBy(resource):
        source_type = "geojson"
    elif IRenderableStyle.providedBy(resource):
        source_type = "xyz"
    elif isinstance(resource, RasterLayer) and resource.cog:
        source_type = "geotiff"

    if IBboxLayer.providedBy(resource):
        extent = resource.extent
    else:
        extent = None
        parent = resource.parent
        if IBboxLayer.providedBy(parent):
            parent_permissions = parent.permissions(request.user)
            if ResourceScope.read in parent_permissions:
                extent = parent.extent

    return dict(
        obj=resource,
        extent=extent,
        source_type=source_type,
        title=_("Preview"),
        maxheight=True,
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
    )

    @Resource.__dynmenu__.add
    def _resource_dynmenu(args):
        if (
            IFeatureLayer.providedBy(args.obj)
            or IRenderableStyle.providedBy(args.obj)
            or (isinstance(args.obj, RasterLayer) and args.obj.cog)
        ) and (args.obj.has_permission(DataScope.read, args.request.user)):
            yield Link(
                "extra/preview",
                _("Preview"),
                lambda args: args.request.route_url("layer_preview.map", id=args.obj.id),
                important=True,
                icon="material-preview",
            )
