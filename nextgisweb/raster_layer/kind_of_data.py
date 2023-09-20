from nextgisweb.env import _

from nextgisweb.core import KindOfData


class RasterLayerData(KindOfData):
    identity = "raster_layer"
    display_name = _("Rasters and pyramids")
