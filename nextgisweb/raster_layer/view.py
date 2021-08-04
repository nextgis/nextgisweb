# -*- coding: utf-8 -*-
from __future__ import division, absolute_import, print_function, unicode_literals

from pyramid.httpexceptions import HTTPNotFound

from .. import dynmenu as dm
from ..pyramid import viewargs
from ..resource import Widget, Resource

from .model import RasterLayer
from .util import _


class RasterLayerWidget(Widget):
    resource = RasterLayer
    operation = ('create', 'update')
    amdmod = 'ngw-raster-layer/Widget'


@viewargs(renderer='nextgisweb:raster_layer/template/export.mako')
def export(request):
    if not request.has_export_permission():
        raise HTTPNotFound()
    return dict(obj=request.context, subtitle=_("Save as"), maxheight=True)


def setup_pyramid(comp, config):
    config.add_view(export, route_name='resource.export.page', context=RasterLayer)

    # Layer menu extension
    class LayerMenuExt(dm.DynItem):

        def build(self, args):
            if isinstance(args.obj, RasterLayer):
                yield dm.Label('raster_layer', _("Raster layer"))

                if args.request.has_export_permission():
                    yield dm.Link(
                        'raster_layer/export', _("Save as"),
                        lambda args: args.request.route_url(
                            "resource.export.page",
                            id=args.obj.id))

    Resource.__dynmenu__.add(LayerMenuExt())
