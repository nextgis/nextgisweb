from nextgisweb.env import _

from nextgisweb.resource import Widget
from nextgisweb.resource.view import resource_sections

from .model import Connection, Layer


class ClientWidget(Widget):
    resource = Connection
    operation = ("create", "update")
    amdmod = "ngw-wmsclient/ConnectionWidget"


class LayerWidget(Widget):
    resource = Layer
    operation = ("create", "update")
    amdmod = "ngw-wmsclient/LayerWidget"


class LayerVendorParamsWidget(Widget):
    resource = Layer
    operation = ("create", "update")
    amdmod = "ngw-wmsclient/LayerVendorParamsWidget"


def setup_pyramid(comp, conf):
    @resource_sections(
        title=_("WMS capabilities"),
        template="section_connection.mako",
        priority=50,
    )
    def resource_section_connection(obj):
        return obj.cls == "wmsclient_connection" and obj.capcache()
