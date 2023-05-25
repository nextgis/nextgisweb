from ..pyramid import viewargs
from ..lib.dynmenu import Link, DynItem
from ..feature_layer import IFeatureLayer
from ..layer.interface import IBboxLayer
from ..render import IRenderableStyle
from ..resource import DataScope, Resource, ResourceScope, resource_factory
from ..raster_layer import RasterLayer

from .util import _


@viewargs(renderer="nextgisweb:layer_preview/template/preview.mako")
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
        r"/resource/{id:\d+}/preview",
        factory=resource_factory
    ) \
        .add_view(preview_map, context=IFeatureLayer) \
        .add_view(preview_map, context=IRenderableStyle) \
        .add_view(preview_map, context=RasterLayer)

    class LayerMenuExt(DynItem):
        def build(self, args):
            if (
                IFeatureLayer.providedBy(args.obj)
                or IRenderableStyle.providedBy(args.obj)
                or (isinstance(args.obj, RasterLayer) and args.obj.cog)
            ) and (
                args.obj.has_permission(DataScope.read, args.request.user)
            ):
                yield Link(
                    "extra/preview", _("Preview"),
                    lambda args: args.request.route_url(
                        "layer_preview.map", id=args.obj.id
                    ),
                    important=True, icon='material-preview')

    Resource.__dynmenu__.add(LayerMenuExt())
