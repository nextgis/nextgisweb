from msgspec import Struct

from nextgisweb.file_upload import FileUploadRef
from nextgisweb.file_upload.exception import UnsupportedFile
from nextgisweb.pyramid import client_setting

from .component import VectorLayerComponent
from .util import msg_supported_formats, read_dataset_vector


class InspectResponse(Struct, kw_only=True):
    layers: list[str]


def inspect(request, *, body: FileUploadRef) -> InspectResponse:
    """Inspect uploaded file for layers

    :returns: List of layers detected in the uploaded file"""

    fupload = body()
    ogrds = read_dataset_vector(str(fupload.data_path), source_filename=fupload.name)
    if ogrds is None:
        raise UnsupportedFile(fupload, detail=msg_supported_formats)

    layers = [ogrds.GetLayer(idx).GetName() for idx in range(ogrds.GetLayerCount())]
    return InspectResponse(layers=layers)


@client_setting("msgSupportedFormats")
def cs_msg_supported_formats(comp: VectorLayerComponent, request) -> str:
    tr = request.localizer.translate
    return tr(msg_supported_formats)


def setup_pyramid(comp, config):
    config.add_route(
        "vector_layer.inspect",
        "/api/component/vector_layer/inspect",
        post=inspect,
    )
