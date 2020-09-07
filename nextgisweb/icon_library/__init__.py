# -*- coding: utf-8 -*-
from __future__ import division, absolute_import, print_function, unicode_literals

from ..component import Component

from .model import Base, SVGSymbolLibrary

__all__ = ['SVGSymbolLibrary']


class IconLibraryComponent(Component):
    identity = 'icon_library'
    metadata = Base.metadata

    def setup_pyramid(self, config):
        from . import api, view  # NOQA
        api.setup_pyramid(self, config)
        view.setup_pyramid(self, config)
