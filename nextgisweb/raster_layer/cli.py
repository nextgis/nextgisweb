from ..env.cli import cli, EnvCommand

from .model import RasterLayer
from .component import RasterLayerComponent


@cli.group()
class raster_layer:
    pass


@raster_layer.command()
def rebuild_overview(self: EnvCommand):
    for resource in RasterLayer.filter_by(cog=False):
        resource.build_overview()


@raster_layer.command()
def cleanup(self: EnvCommand, *, raster_layer: RasterLayerComponent):
    raster_layer.cleanup()
