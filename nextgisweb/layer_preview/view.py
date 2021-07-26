# -*- coding: utf-8 -*-
from __future__ import division, absolute_import, print_function, unicode_literals

from ..pyramid import viewargs
from ..dynmenu import Link, DynItem
from ..feature_layer import IFeatureLayer
from ..render import IRenderableStyle
from ..resource import Resource, resource_factory

from .util import _


@viewargs(renderer='nextgisweb:layer_preview/template/preview.mako')
def preview_map(request):
    if IFeatureLayer.providedBy(request.context):
        source_type = "mvt"
    elif IRenderableStyle.providedBy(request.context):
        source_type = "xyz"

    return dict(
        obj=request.context,
        source_type=source_type,
        subtitle=_("Preview"),
        maxheight=True)


def setup_pyramid(comp, config):
    config.add_route(
        "layer_preview.map",
        r"/resource/{id:\d+}/layer_preview",
        factory=resource_factory) \
    .add_view(preview_map, context=IFeatureLayer) \
    .add_view(preview_map, context=IRenderableStyle)

    class LayerMenuExt(DynItem):
        def build(self, args):
            if (
                IFeatureLayer.providedBy(args.obj) or
                IRenderableStyle.providedBy(args.obj)
            ):
                yield Link(
                    "extra/preview",
                    _("Preview"),
                    lambda args: args.request.route_url(
                        "layer_preview.map", id=args.obj.id
                    ),
                )

    Resource.__dynmenu__.add(LayerMenuExt())
