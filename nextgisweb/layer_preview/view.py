# -*- coding: utf-8 -*-
from __future__ import division, absolute_import, print_function, unicode_literals

from ..pyramid import viewargs
from ..dynmenu import Link, DynItem
from ..feature_layer import IFeatureLayer
from ..layer.interface import IBboxLayer
from ..render import IRenderableStyle
from ..resource import Resource, ResourceScope, resource_factory

from .util import _


@viewargs(renderer="nextgisweb:layer_preview/template/preview.mako")
def preview_map(request):
    extent = None

    if IFeatureLayer.providedBy(request.context):
        source_type = "mvt"
    elif IRenderableStyle.providedBy(request.context):
        source_type = "xyz"

    if IBboxLayer.providedBy(request.context):
        extent = request.context.extent
    else:
        parent = request.context.parent
        if IBboxLayer.providedBy(parent):
            parent_permissions = parent.permissions(request.user)
            if ResourceScope.read in parent_permissions:
                extent = parent.extent

    return dict(
        obj=request.context,
        extent=extent,
        source_type=source_type,
        subtitle=_("Preview"),
    )


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
                    'material:viewMap', True, '_blank')

    Resource.__dynmenu__.add(LayerMenuExt())
