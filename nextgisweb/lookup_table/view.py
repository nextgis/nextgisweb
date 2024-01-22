from nextgisweb.env import _

from nextgisweb.resource import Widget
from nextgisweb.resource.view import resource_sections

from .model import LookupTable


class Widget(Widget):
    resource = LookupTable
    operation = ("create", "update")
    amdmod = "@nextgisweb/lookup-table/editor"


def setup_pyramid(comp, config):
    @resource_sections(title=_("Lookup table"), priority=10)
    def resource_section(obj):
        if isinstance(obj, LookupTable):
            return dict(lookup_value=obj.val)
