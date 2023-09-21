from nextgisweb.env import _

from nextgisweb.core import KindOfData


class VectorLayerData(KindOfData):
    identity = "vector_layer"
    display_name = _("Vector layer features")
