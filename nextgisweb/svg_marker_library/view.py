from nextgisweb.env import COMP_ID, _
from nextgisweb.lib.dynmenu import Label, Link

from nextgisweb.resource import Resource, Widget
from nextgisweb.resource.view import resource_sections

from .model import SVGMarkerLibrary


class Widget(Widget):
    resource = SVGMarkerLibrary
    operation = ("create", "update")
    amdmod = "@nextgisweb/svg-marker-library/resource-widget"


def setup_pyramid(comp, config):
    @Resource.__dynmenu__.add
    def _resource_dynmenu(args):
        if not isinstance(args.obj, SVGMarkerLibrary):
            return

        yield Label(COMP_ID, _("SVG marker library"))

        yield Link(
            "svg_marker_library/export",
            _("Export"),
            lambda args: args.request.route_url("resource.export", id=args.obj.id),
        )

    @resource_sections(title=_("SVG marker library"), priority=20)
    def resource_section(obj):
        return isinstance(obj, SVGMarkerLibrary)
