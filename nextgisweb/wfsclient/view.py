from nextgisweb.jsrealm import jsentry
from nextgisweb.resource import Widget

from .model import WFSConnection, WFSLayer


class WFSConnectionWidget(Widget):
    resource = WFSConnection
    operation = ("create", "update")
    amdmod = jsentry("@nextgisweb/wfsclient/wfsclient-connection")


class WFSLayerWidget(Widget):
    resource = WFSLayer
    operation = ("create", "update")
    amdmod = jsentry("@nextgisweb/wfsclient/wfsclient-layer")
