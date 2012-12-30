from ..component import Component

from .models import RasterLayer


@Component.registry.register
class RasterLayerComponent(Component):
    identity = 'raster_layer'

    pass