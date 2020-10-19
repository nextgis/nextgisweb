# -*- coding: utf-8 -*-
from __future__ import division, absolute_import, print_function, unicode_literals

from ..component import Component

from .model import Base, SVGMarkerLibrary

__all__ = ['SVGMarkerLibrary']


class SVGMarkerLibraryComponent(Component):
    identity = 'svg_marker_library'
    metadata = Base.metadata

    def setup_pyramid(self, config):
        from . import api, view  # NOQA
        api.setup_pyramid(self, config)
        view.setup_pyramid(self, config)
