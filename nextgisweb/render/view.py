from nextgisweb.env import env, gettext

from nextgisweb.jsrealm import jsentry
from nextgisweb.resource import Resource, Widget
from nextgisweb.resource.extaccess import ExternalAccessLink
from nextgisweb.resource.view import resource_sections

from .interface import IRenderableNonCached, IRenderableStyle
from .legend import ILegendSymbols

LEGEND_SYMBOLS_WIDGET_JSENTRY = jsentry("@nextgisweb/render/legend-symbols-widget")


class TileCacheWidget(Widget):
    interface = IRenderableStyle
    operation = ("create", "update")
    amdmod = jsentry("@nextgisweb/render/tile-cache-widget")

    def is_applicable(self):
        return (
            env.render.tile_cache_enabled
            and not IRenderableNonCached.providedBy(self.obj)
            and super().is_applicable()
        )


class TMSLink(ExternalAccessLink):
    title = gettext("TMS (Tile Map Service)")
    help = gettext(
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
    @resource_sections(title=gettext("Legend symbols"))
    def resource_section_legend_symbols(obj):
        return env.render.options["legend_symbols_section"] and ILegendSymbols.providedBy(obj)
