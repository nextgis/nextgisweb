from ..env.cli import cli, EnvCommand


@cli.group()
class file_upload:
    pass


@file_upload.command()
def cleanup(self: EnvCommand):
    self.env.file_upload.cleanup()
