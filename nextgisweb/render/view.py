from ..resource import (Widget, Resource)
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
    Resource.__psection__.register(
        key='description', title=_("External access"),
        is_applicable=lambda obj: IRenderableStyle.providedBy(obj),
        template='section_api_renderable.mako')

    Resource.__psection__.register(
        key='legend_symbols', title=_("Legend symbols"),
        is_applicable=lambda obj: (
            env.render.options['legend_symbols_section']
            and ILegendSymbols.providedBy(obj)),
        template='section_legend_symbols.mako')
