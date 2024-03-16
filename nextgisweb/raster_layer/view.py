from pyramid.httpexceptions import HTTPNotFound

from nextgisweb.env import _
from nextgisweb.lib import dynmenu as dm

from nextgisweb.pyramid import viewargs
from nextgisweb.resource import Resource, Widget
from nextgisweb.resource.extaccess import ExternalAccessLink

from .model import RasterLayer


class RasterLayerWidget(Widget):
    resource = RasterLayer
    operation = ("create", "update")
    amdmod = "@nextgisweb/raster-layer/editor-widget"


@viewargs(renderer="react")
def export(request):
    if not request.context.has_export_permission(request.user):
        raise HTTPNotFound()
    return dict(
        obj=request.context,
        title=_("Save as"),
        props=dict(id=request.context.id),
        entrypoint="@nextgisweb/raster-layer/export-form",
        maxheight=True,
    )


class COGLink(ExternalAccessLink):
    title = _("Cloud Optimized GeoTIFF")
    help = _(
        "A Cloud Optimized GeoTIFF (COG) is a regular GeoTIFF file, aimed at being hosted on a HTTP file server, with an internal organization that enables more efficient workflows on the cloud. It does this by leveraging the ability of clients issuing ​HTTP GET range requests to ask for just the parts of a file they need."
    )

    resource = RasterLayer
    attr_name = "cog"

    @classmethod
    def url_factory(cls, obj, request) -> str:
        return request.route_url("raster_layer.cog", id=obj.id)


def setup_pyramid(comp, config):
    config.add_view(
        export,
        route_name="resource.export.page",
        context=RasterLayer,
    )

    @Resource.__dynmenu__.add
    def _resource_dynmenu(args):
        if not isinstance(args.obj, RasterLayer):
            return

        yield dm.Label("raster_layer", _("Raster layer"))

        if args.obj.has_export_permission(args.request.user):
            yield dm.Link(
                "raster_layer/export",
                _("Save as"),
                lambda args: args.request.route_url("resource.export.page", id=args.obj.id),
                icon="material-save_alt",
            )
            yield dm.Link(
                "raster_layer/download",
                _("Download"),
                lambda args: args.request.route_url("raster_layer.download", id=args.obj.id),
                icon="material-download",
            )
