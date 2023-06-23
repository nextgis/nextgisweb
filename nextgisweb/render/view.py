from ..resource import Widget, Resource
from ..resource.view import resource_sections
from ..resource.extaccess import ExternalAccessLink
from ..env import env

from .interface import IRenderableStyle
from .legend import ILegendSymbols
from .util import _


class TileCacheWidget(Widget):
    interface = IRenderableStyle
    operation = ('create', 'update')
    amdmod = '@nextgisweb/render/tile-cache-widget'

    def is_applicable(self):
        return env.render.tile_cache_enabled \
            and super().is_applicable()

    def config(self):
        result = super().config()
        opts = env.render.options.with_prefix('tile_cache')
        result['featureTrackChanges'] = opts['track_changes']
        result['featureSeed'] = opts['seed']
        return result


class TMSLink(ExternalAccessLink):
    title = _("TMS (Tile Map Service)")
    help = _("TMS (Tile Map Service) is a specification for tiled web maps. Tiled web map is a map displayed in a browser by seamlessly joining dozens of individually requested image.")
    doc_url = "https://docs.nextgis.com/docs_ngweb_dev/doc/developer/misc.html?lang={lang}#render"

    interface = IRenderableStyle

    @classmethod
    def url_factory(cls, obj: Resource, request) -> str:
        return request.route_url('render.tile', _query=dict(
            resource=obj.id, nd=204)) + "&z={z}&x={x}&y={y}"


def setup_pyramid(comp, config):

    @resource_sections(title=_("Legend symbols"))
    def resource_section_legend_symbols(obj):
        return env.render.options['legend_symbols_section'] \
            and ILegendSymbols.providedBy(obj)
