from nextgisweb.jsrealm import jsentry
from nextgisweb.resource import Widget

from .model import VectorLayer


class VectorLayerWidget(Widget):
    resource = VectorLayer
    operation = ("create", "update")
    amdmod = jsentry("@nextgisweb/vector-layer/resource-widget")

    def is_applicable(self):
        return isinstance(self.obj, VectorLayer) and self.obj.fversioning is None
