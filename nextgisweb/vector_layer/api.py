from typing import List

from msgspec import Struct

from nextgisweb.env import gettext

from nextgisweb.core.exception import ValidationError
from nextgisweb.file_upload import FileUpload
from nextgisweb.file_upload.api import FileID

from .util import read_dataset_vector


class InspectBody(Struct, kw_only=True):
    id: FileID


class InspectResponse(Struct, kw_only=True):
    layers: List[str]


def inspect(request, *, body: InspectBody) -> InspectResponse:
    """Inspect uploaded file for layers"""

    fupload = FileUpload(id=body.id)
    ogrds = read_dataset_vector(str(fupload.data_path), source_filename=fupload.name)
    if ogrds is None:
        raise ValidationError(gettext("GDAL library failed to open file."))

    layers = [ogrds.GetLayer(idx).GetName() for idx in range(ogrds.GetLayerCount())]
    return InspectResponse(layers=layers)


def setup_pyramid(comp, config):
    config.add_route(
        "vector_layer.inspect",
        "/api/component/vector_layer/inspect",
        post=inspect,
    )
