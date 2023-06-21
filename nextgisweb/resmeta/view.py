from ..resource import Widget, Resource
from ..resource.view import resource_sections
from .util import _


class Widget(Widget):
    resource = Resource
    operation = ('create', 'update')
    amdmod = '@nextgisweb/resmeta/editor'


def setup_pyramid(comp, config):
    @resource_sections(title=_("Metadata"), priority=40)
    def resource_section(obj):
        return len(obj.resmeta) > 0
