from ..env.cli import cli, EnvCommand

from .model import RasterLayer

@cli.group()
class raster_layer:
    pass


@raster_layer.command()
def rebuild_overview(self: EnvCommand):
    for resource in RasterLayer.filter_by(cog=False):
        resource.build_overview()


@raster_layer.command()
def cleanup(self: EnvCommand):
    self.env.raster_layer.cleanup()
