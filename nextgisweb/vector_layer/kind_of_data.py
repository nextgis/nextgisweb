from nextgisweb.env import gettext

from nextgisweb.core import KindOfData


class VectorLayerData(KindOfData):
    identity = "vector_layer"
    display_name = gettext("Vector layer features")
