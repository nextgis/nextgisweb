from nextgisweb.env.cli import DryRunOptions, EnvCommand, comp_cli

from .component import SLDComponent


@comp_cli.command()
class cleanup(DryRunOptions, EnvCommand):
    def __call__(self, *, sld: SLDComponent):
        sld.cleanup(dry_run=self.dry_run)

        if self.dry_run:
            print("Use --no-dry-run option to make the changes!")
