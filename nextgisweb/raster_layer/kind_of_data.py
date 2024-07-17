from nextgisweb.env import gettext

from nextgisweb.core import KindOfData


class RasterLayerData(KindOfData):
    identity = "raster_layer"
    display_name = gettext("Rasters and pyramids")
