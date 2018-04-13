# -*- coding: utf-8 -*-
from ..command import Command

from .model import RasterLayer

@Command.registry.register
class RebuildOverviewCommand():
    identity = 'raster_layer.rebuild_overview'

    @classmethod
    def argparser_setup(cls, parser, env):
        pass

    @classmethod
    def execute(cls, args, env):
        for resource in RasterLayer.query():
            resource.build_overview()
