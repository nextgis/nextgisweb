from nextgisweb.env import gettext

from nextgisweb.basemap.model import BasemapLayer
from nextgisweb.feature_layer import IFeatureLayer
from nextgisweb.gui import react_renderer
from nextgisweb.pyramid.tomb import Configurator, Request
from nextgisweb.raster_layer import RasterLayer
from nextgisweb.render import IRenderableStyle
from nextgisweb.resource import DataScope, resource_factory

from .component import LayerPreviewComponent


@react_renderer("@nextgisweb/layer-preview/preview-layer")
def preview_map(context, request: Request):
    request.resource_permission(DataScope.read)

    return dict(
        obj=context,
        props=dict(resourceId=context.id),
        title=gettext("Preview"),
    )


def setup_pyramid(comp: LayerPreviewComponent, config: Configurator):
    config.add_route(
        "layer_preview.map",
        r"/resource/{id:uint}/preview",
        factory=resource_factory,
    ).get(
        preview_map,
        context=IFeatureLayer,
    ).get(
        preview_map,
        context=IRenderableStyle,
    ).get(
        preview_map,
        context=RasterLayer,
    ).get(
        preview_map,
        context=BasemapLayer,
    )
