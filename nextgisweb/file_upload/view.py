from nextgisweb.pyramid import client_setting

from .component import FileUploadComponent


@client_setting("maxSize")
def cs_max_size(comp: FileUploadComponent, request) -> int:
    return comp.max_size


@client_setting("chunkSize")
def cs_chunk_size(comp: FileUploadComponent, request) -> int:
    return comp.chunk_size


def setup_pyramid(comp, config):
    pass
