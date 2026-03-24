from nextgisweb.env import gettext, gettextf
from nextgisweb.lib.i18n.trstr import TrStr

from nextgisweb.core.exception import ValidationError

from .model import FileUpload, FileUploadRef


class UnsupportedFile(ValidationError):
    title = gettext("Unsupported file")
    message = gettextf(
        "The file '{fn}' could not be processed. Please verify that it "
        "is provided in a supported format and try again. If the problem "
        "persists, contact support."
    )
    detail = None

    def __init__(self, file: FileUpload | None, *, detail: TrStr | None = None):
        super().__init__(
            message=self.__class__.message.format(fn=file.name if file else "UNKNOWN"),
            detail=detail,
            data=dict(file_upload=FileUploadRef(id=file.id) if file else None),
        )
