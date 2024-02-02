from zope.interface import Attribute, Interface
from zope.interface.interface import adapter_hooks

from nextgisweb.layer import IBboxLayer
from nextgisweb.resource import IResourceAdapter, IResourceBase


class IRenderableStyle(IResourceBase):
    srs = Attribute(""" Source SRS """)

    def render_request(self, srs, cond=None):
        pass


class ILegendableStyle(IResourceBase):
    def render_legend(self):
        pass


class IExtentRenderRequest(Interface):
    def render_extent(self, extent, size):
        pass


class ITileRenderRequest(Interface):
    def render_tile(self, tile, size):
        pass


class IRenderableNonCached(IRenderableStyle):
    pass


class IRenderableScaleRange(IRenderableStyle):
    def scale_range(self):
        pass


@adapter_hooks.append
def style_adapter_hook(iface, param):
    if (
        iface is IResourceAdapter
        and param[0] is IBboxLayer
        and param[1].identity.endswith("_style")
    ):
        # FIXME: IBboxLayer may not be provided by parent
        return lambda res: res.parent
