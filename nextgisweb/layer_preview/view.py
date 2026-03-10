from nextgisweb.env import gettext

from nextgisweb.basemap.model import BasemapLayer
from nextgisweb.feature_layer import IFeatureLayer
from nextgisweb.gui import react_renderer
from nextgisweb.raster_layer import RasterLayer
from nextgisweb.render import IRenderableStyle
from nextgisweb.resource import DataScope, resource_factory


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
