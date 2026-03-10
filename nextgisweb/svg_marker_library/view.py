from nextgisweb.jsrealm import jsentry
from nextgisweb.resource import Widget
from nextgisweb.resource.view import resource_sections

from .model import SVGMarkerLibrary


class SVGMarkerLibraryWidget(Widget):
    resource = SVGMarkerLibrary
    operation = ("create", "update")
    amdmod = jsentry("@nextgisweb/svg-marker-library/resource-widget")


@resource_sections("@nextgisweb/svg-marker-library/resource-section")
def _resource_section(obj, **kwargs):
    return isinstance(obj, SVGMarkerLibrary)


def setup_pyramid(comp, config):
    pass
