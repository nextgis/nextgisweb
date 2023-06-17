from pyramid.httpexceptions import HTTPNotFound

from ..lib import dynmenu as dm
from ..resource import Widget, Resource
from ..resource.view import resource_sections
from ..pyramid import viewargs

from .model import RasterLayer
from .util import _


class RasterLayerWidget(Widget):
    resource = RasterLayer
    operation = ('create', 'update')
    amdmod = 'ngw-raster-layer/Widget'


@viewargs(renderer='react')
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

    @resource_sections(title=_("External access"), template='section_api_cog.mako')
    def resource_section_external_access(obj):
        return obj.cls == 'raster_layer' and obj.cog
