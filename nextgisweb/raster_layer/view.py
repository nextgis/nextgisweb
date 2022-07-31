from pyramid.httpexceptions import HTTPNotFound

from .. import dynmenu as dm
from ..gui import REACT_RENDERER
from ..resource import Widget, Resource

from .model import RasterLayer
from .util import _


class RasterLayerWidget(Widget):
    resource = RasterLayer
    operation = ('create', 'update')
    amdmod = 'ngw-raster-layer/Widget'


def export(request):
    if not request.context.has_export_permission(request.user):
        raise HTTPNotFound()
    return dict(
        obj=request.context,
        title=_("Save as"),
        props=dict(id=request.context.id),
        entrypoint="@nextgisweb/raster_layer/export-form",
        maxheight=True,
    )


def setup_pyramid(comp, config):
    config.add_view(
        export,
        route_name='resource.export.page',
        context=RasterLayer,
        renderer=REACT_RENDERER,
    )

    # Layer menu extension
    class LayerMenuExt(dm.DynItem):

        def build(self, args):
            if isinstance(args.obj, RasterLayer):
                yield dm.Label('raster_layer', _("Raster layer"))

                if args.obj.has_export_permission(args.request.user):
                    yield dm.Link(
                        'raster_layer/export', _("Save as"),
                        lambda args: args.request.route_url(
                            "resource.export.page",
                            id=args.obj.id),
                        icon='material-save_alt')
                    yield dm.Link(
                        'raster_layer/download', _("Download"),
                        lambda args: args.request.route_url(
                            "raster_layer.download",
                            id=args.obj.id),
                        icon='material-download')

    Resource.__dynmenu__.add(LayerMenuExt())

    Resource.__psection__.register(
        key='description',
        title=_("External access"),
        is_applicable=lambda obj: obj.cls == 'raster_layer' and obj.cog,
        template='nextgisweb:raster_layer/template/section_api_cog.mako')
