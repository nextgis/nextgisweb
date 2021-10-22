from nextgisweb.dynmenu import DynItem, Label, Link
from nextgisweb.resource import Resource, Widget

from .model import SVGMarkerLibrary
from .util import _, COMP_ID


class Widget(Widget):
    resource = SVGMarkerLibrary
    operation = ('create', 'update')
    amdmod = 'ngw-svg-marker-library/Widget'


class SVGMarkerLibraryMenu(DynItem):
    def build(self, args):
        yield Label(COMP_ID, _("SVG marker library"))

        if isinstance(args.obj, SVGMarkerLibrary):
            yield Link(
                'svg_marker_library/export', _('Export'),
                lambda args: args.request.route_url('resource.export', id=args.obj.id),
            )


def setup_pyramid(comp, config):
    Resource.__dynmenu__.add(SVGMarkerLibraryMenu())

    Resource.__psection__.register(
        key='svg_marker_library', priority=20, title=_("SVG marker library"),
        is_applicable=lambda obj: isinstance(obj, SVGMarkerLibrary),
        template='nextgisweb:svg_marker_library/template/section.mako')
