from nextgisweb.env.cli import DryRunOptions, EnvCommand, comp_cli, opt

from .component import FileStorageComponent


@comp_cli.command()
class cleanup(DryRunOptions, EnvCommand):
    unreferenced: bool = opt(False, flag=True, doc="Delete or not (default) unreferenced")
    orphaned: bool = opt(True, flag=True, doc="Delete (default) or not orphaned")

    def __call__(self, *, file_storage: FileStorageComponent):
        file_storage.cleanup(
            dry_run=self.dry_run, unreferenced=self.unreferenced, orphaned=self.orphaned
        )

        if self.dry_run:
            print("Use --no-dry-run option to make the changes!")
