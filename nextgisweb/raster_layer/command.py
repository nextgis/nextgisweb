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
        for resource in RasterLayer.filter_by(cog=False):
            resource.build_overview()


@Command.registry.register
class CleanupCommand:
    identity = 'raster_layer.cleanup'

    @classmethod
    def argparser_setup(cls, parser, env):
        pass

    @classmethod
    def execute(cls, args, env):
        env.raster_layer.cleanup()
