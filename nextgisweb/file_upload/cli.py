from nextgisweb.env.cli import EnvCommand, cli

from .component import FileUploadComponent


@cli.group()
class file_upload:
    pass


@file_upload.command()
def cleanup(self: EnvCommand, *, file_upload: FileUploadComponent):
    file_upload.cleanup()
