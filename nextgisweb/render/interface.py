from zope.interface import Interface, Attribute

from ..resource import IResourceBase


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
