# -*- coding: utf-8 -*-
from __future__ import division, absolute_import, print_function, unicode_literals

from nextgisweb.dynmenu import DynItem, Label, Link
from nextgisweb.resource import Resource, Widget

from .model import SVGSymbolLibrary
from .util import _, COMP_ID


class Widget(Widget):
    resource = SVGSymbolLibrary
    operation = ('create', 'update')
    amdmod = 'ngw-icon-library/Widget'


class SVGSymbolLibraryMenu(DynItem):
    def build(self, args):
        yield Label(COMP_ID, _("SVG symbol library"))

        if isinstance(args.obj, SVGSymbolLibrary):
            yield Link(
                'icon_library/export', _('Export'),
                lambda args: args.request.route_url('resource.export', id=args.obj.id),
            )


def setup_pyramid(comp, config):
    Resource.__dynmenu__.add(SVGSymbolLibraryMenu())

    Resource.__psection__.register(
        key='svg_symbol_library', priority=20, title=_("SVG symbol library"),
        is_applicable=lambda obj: isinstance(obj, SVGSymbolLibrary),
        template='nextgisweb:icon_library/template/section.mako')
