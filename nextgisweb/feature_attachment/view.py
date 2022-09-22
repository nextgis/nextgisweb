from pyramid.httpexceptions import HTTPNotFound

from ..resource import resource_factory, DataScope, Resource
from ..feature_layer import IFeatureLayer
from ..gui import REACT_RENDERER
from .. import dynmenu as dm

from .util import _


def export(request):
    request.resource_permission(DataScope.read)

    if not request.context.has_export_permission(request.user):
        raise HTTPNotFound()

    return dict(
        obj=request.context,
        title=_("Export attachments"),
        props=dict(id=request.context.id),
        entrypoint="@nextgisweb/feature_attachment/export-form",
        maxheight=True
    )


def setup_pyramid(comp, config):
    config.add_route(
        'feature_attachment.export.page',
        r'/resource/{id:\d+}/export-attachments',
        factory=resource_factory,
    ).add_view(export, context=IFeatureLayer, renderer=REACT_RENDERER)

    # Layer menu extension
    class LayerMenuExt(dm.DynItem):

        def build(self, args):
            if IFeatureLayer.providedBy(args.obj):
                if args.obj.has_export_permission(args.request.user):
                    yield dm.Link(
                        'feature_layer/feature_attachment-export', _("Export attachments"),
                        lambda args: args.request.route_url(
                            "feature_attachment.export.page",
                            id=args.obj.id))

    Resource.__dynmenu__.add(LayerMenuExt())

