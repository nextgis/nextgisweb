from nextgisweb.resource import Widget

from .model import Connection, Layer


class ClientWidget(Widget):
    resource = Connection
    operation = ("create", "update")
    amdmod = "ngw-tmsclient/ConnectionWidget"


class LayerWidget(Widget):
    resource = Layer
    operation = ("create", "update")
    amdmod = "ngw-tmsclient/LayerWidget"


def setup_pyramid(comp, config):
    pass
