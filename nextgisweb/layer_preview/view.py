from nextgisweb.env import gettext

from nextgisweb.basemap.model import BasemapLayer
from nextgisweb.feature_layer import FeatureLayerMixin
from nextgisweb.gui import react_renderer
from nextgisweb.pyramid.tomb import Configurator, Request
from nextgisweb.raster_layer import RasterLayer
from nextgisweb.render import IRenderableStyle
from nextgisweb.resource import DataScope, Resource, resource_factory

from .component import LayerPreviewComponent


@react_renderer("@nextgisweb/layer-preview/preview-layer")
def preview_map(context: Resource, request: Request) -> dict:
    request.resource_permission(DataScope.read)

    return {
        "obj": context,
        "props": {"resourceId": context.id},
        "title": gettext("Preview"),
    }


def setup_pyramid(comp: LayerPreviewComponent, config: Configurator) -> None:
    config.add_route(
        "layer_preview.map",
        r"/resource/{id:uint}/preview",
        factory=resource_factory,
    ).get(
        preview_map,
        context=FeatureLayerMixin,
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
