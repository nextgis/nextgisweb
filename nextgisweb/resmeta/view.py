from nextgisweb.env import gettext

from nextgisweb.jsrealm import jsentry
from nextgisweb.resource import Resource, Widget
from nextgisweb.resource.view import resource_sections


class Widget(Widget):
    resource = Resource
    operation = ("create", "update")
    amdmod = jsentry("@nextgisweb/resmeta/editor")


def setup_pyramid(comp, config):
    @resource_sections(title=gettext("Metadata"), priority=40)
    def resource_section(obj):
        return len(obj.resmeta) > 0
