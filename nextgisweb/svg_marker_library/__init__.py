# -*- coding: utf-8 -*-
from __future__ import division, absolute_import, print_function, unicode_literals

from os import path

from ..component import Component
from ..lib.config import Option, OptionAnnotations

from .model import Base, SVGMarker, SVGMarkerLibrary

__all__ = ['SVGMarker', 'SVGMarkerLibrary']

PRESET_DIR = path.join(path.dirname(__file__), 'preset/')


class SVGMarkerLibraryComponent(Component):
    identity = 'svg_marker_library'
    metadata = Base.metadata

    def setup_pyramid(self, config):
        from . import api, view  # NOQA
        api.setup_pyramid(self, config)
        view.setup_pyramid(self, config)

    option_annotations = OptionAnnotations((
        Option('svg_paths', list, default=[PRESET_DIR], doc="Search paths for SVG files."),
    ))
