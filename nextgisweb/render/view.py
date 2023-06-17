from ..resource import Widget, Resource
from ..resource.view import resource_sections
from ..env import env

from .interface import IRenderableStyle
from .legend import ILegendSymbols
from .util import _


class TileCacheWidget(Widget):
    interface = IRenderableStyle
    operation = ('create', 'update')
    amdmod = 'ngw-render/TileCacheWidget'

    def is_applicable(self):
        return env.render.tile_cache_enabled \
            and super().is_applicable()


def setup_pyramid(comp, config):
    
    @resource_sections(title=_("External access"), template='section_api_renderable.mako')
    def resource_section_external_access(obj):
        return IRenderableStyle.providedBy(obj)
    
    @resource_sections(title=_("Legend symbols"))
    def resource_section_legend_symbols(obj):
        return env.render.options['legend_symbols_section'] \
            and ILegendSymbols.providedBy(obj)
