from nextgisweb.env import _

from nextgisweb.resource import Resource, Widget
from nextgisweb.resource.view import resource_sections


class Widget(Widget):
    resource = Resource
    operation = ("create", "update")
    amdmod = "@nextgisweb/resmeta/editor"


def setup_pyramid(comp, config):
    @resource_sections(title=_("Metadata"), priority=40)
    def resource_section(obj):
        return len(obj.resmeta) > 0
