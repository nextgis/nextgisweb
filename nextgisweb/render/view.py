from nextgisweb.env import _, env

from nextgisweb.resource import Resource, Widget
from nextgisweb.resource.extaccess import ExternalAccessLink
from nextgisweb.resource.view import resource_sections

from .interface import IRenderableNonCached, IRenderableStyle
from .legend import ILegendSymbols


class TileCacheWidget(Widget):
    interface = IRenderableStyle
    operation = ("create", "update")
    amdmod = "@nextgisweb/render/tile-cache-widget"

    def is_applicable(self):
        return (
            env.render.tile_cache_enabled
            and not IRenderableNonCached.providedBy(self.obj)
            and super().is_applicable()
        )

    def config(self):
        result = super().config()
        opts = env.render.options.with_prefix("tile_cache")
        result["featureTrackChanges"] = opts["track_changes"]
        result["featureSeed"] = opts["seed"]
        return result


class TMSLink(ExternalAccessLink):
    title = _("TMS (Tile Map Service)")
    help = _(
        "TMS (Tile Map Service) is a specification for tiled web maps. Tiled web map is a map displayed in a browser by seamlessly joining dozens of individually requested image."
    )
    docs_url = "docs_ngweb_dev/doc/developer/misc.html#render"

    interface = IRenderableStyle

    @classmethod
    def url_factory(cls, obj: Resource, request) -> str:
        return (
            request.route_url("render.tile", _query=dict(resource=obj.id, nd=204))
            + "&z={z}&x={x}&y={y}"
        )


def setup_pyramid(comp, config):
    @resource_sections(title=_("Legend symbols"))
    def resource_section_legend_symbols(obj):
        return env.render.options["legend_symbols_section"] and ILegendSymbols.providedBy(obj)
