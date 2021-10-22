from .model import RasterMosaic
from ..resource import Widget


class ItemWidget(Widget):
    resource = RasterMosaic
    operation = ('create', 'update')
    amdmod = 'ngw-raster-mosaic/ItemWidget'
