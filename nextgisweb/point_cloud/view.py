from nextgisweb.jsrealm import jsentry
from nextgisweb.resource import Widget

from .model import PointCloud


class PointCloudWidget(Widget):
    resource = PointCloud
    operation = ("create", "update")
    amdmod = jsentry("@nextgisweb/point-cloud/editor-widget")


def setup_pyramid(comp, config):
    pass
