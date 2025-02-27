from nextgisweb.env import gettext

from nextgisweb.jsrealm import jsentry
from nextgisweb.resource import Widget
from nextgisweb.resource.view import resource_sections

from .model import Connection, Layer


class ClientWidget(Widget):
    resource = Connection
    operation = ("create", "update")
    amdmod = jsentry("@nextgisweb/wmsclient/wmsclient-connection")


class LayerWidget(Widget):
    resource = Layer
    operation = ("create", "update")
    amdmod = jsentry("@nextgisweb/wmsclient/wmsclient-layer")


def setup_pyramid(comp, conf):
    @resource_sections(
        title=gettext("WMS capabilities"),
        template="section_connection.mako",
        priority=50,
    )
    def resource_section_connection(obj):
        return obj.cls == "wmsclient_connection" and obj.capcache()
