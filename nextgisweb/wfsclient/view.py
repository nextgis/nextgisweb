from nextgisweb.resource import Widget

from .model import WFSConnection, WFSLayer


class WFSConnectionWidget(Widget):
    resource = WFSConnection
    operation = ("create", "update")
    amdmod = "@nextgisweb/wfsclient/wfsclient-connection"


class WFSLayerWidget(Widget):
    resource = WFSLayer
    operation = ("create", "update")
    amdmod = "@nextgisweb/wfsclient/wfsclient-layer"
