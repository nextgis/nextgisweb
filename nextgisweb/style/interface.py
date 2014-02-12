# -*- coding: utf-8 -*-
from zope.interface import Interface

from ..resource import IResourceInterface


class IRenderableStyle(IResourceInterface):

    def render_request(self, srs):
        pass


class IExtentRenderRequest(Interface):

    def render_extent(self, extent, size):
        pass


class ITileRenderRequest(Interface):

    def render_tile(self, tile, size):
        pass
