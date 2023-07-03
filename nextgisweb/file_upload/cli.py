from nextgisweb.env.cli import EnvCommand, comp_cli

from .component import FileUploadComponent


@comp_cli.command()
def cleanup(self: EnvCommand, *, file_upload: FileUploadComponent):
    file_upload.cleanup()
