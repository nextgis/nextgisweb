from nextgisweb.jsrealm import jsentry
from nextgisweb.resource import Resource, Widget
from nextgisweb.resource.view import resource_sections


class ResMetaWidget(Widget):
    resource = Resource
    operation = ("create", "update")
    amdmod = jsentry("@nextgisweb/resmeta/editor")


@resource_sections("@nextgisweb/resmeta/resource-section", order=80)
def resource_section(obj, **kwargs):
    return len(obj.resmeta) > 0


def setup_pyramid(comp, config):
    pass
