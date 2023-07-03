from nextgisweb.env.cli import EnvCommand, comp_cli

from .component import RasterLayerComponent
from .model import RasterLayer


@comp_cli.command()
def rebuild_overview(self: EnvCommand):
    for resource in RasterLayer.filter_by(cog=False):
        resource.build_overview()


@comp_cli.command()
def cleanup(self: EnvCommand, *, raster_layer: RasterLayerComponent):
    raster_layer.cleanup()
