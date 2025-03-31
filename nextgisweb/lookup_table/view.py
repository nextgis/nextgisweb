from nextgisweb.jsrealm import jsentry
from nextgisweb.resource import Widget
from nextgisweb.resource.view import resource_sections

from .model import LookupTable


class LookupTableWidget(Widget):
    resource = LookupTable
    operation = ("create", "update")
    amdmod = jsentry("@nextgisweb/lookup-table/editor")


@resource_sections("@nextgisweb/lookup-table/resource-section")
def resource_section(obj, **kwargs):
    return isinstance(obj, LookupTable) and len(obj.value) > 0


def setup_pyramid(comp, config):
    pass
