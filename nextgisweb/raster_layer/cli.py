from nextgisweb.env.cli import EnvCommand, comp_cli

from .model import RasterLayer


@comp_cli.command()
def rebuild_overview(self: EnvCommand):
    for resource in RasterLayer.filter_by(cog=False):
        resource.build_overview()
