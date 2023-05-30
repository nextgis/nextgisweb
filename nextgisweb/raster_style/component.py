from ..env import Component

from .models import Base


class RasterStyleComponent(Component):
    identity = 'raster_style'
    metadata = Base.metadata
