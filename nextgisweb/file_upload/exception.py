from nextgisweb.env import gettext, gettextf
from nextgisweb.lib.i18n.trstr import TrStr

from nextgisweb.core.exception import ValidationError
from nextgisweb.core.storage import StorageInsufficient

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


class FileUploadStorageInsufficient(StorageInsufficient):
    message = gettextf(
        "The file you are trying to upload is {file_size} and cannot be uploaded as it "
        "would exceed the total storage limit by {excess_size}. "
        "You currently have only {storage_free} of {storage_limit} available. "
        "Free up some storage space before uploading."
    )

    def __init__(self, *, cause: StorageInsufficient):
        super().__init__(
            total=cause._storage_total,
            limit=cause._storage_limit,
            requested=cause._storage_requested,
        )

    def fmt_message(self):
        return self.__class__.message(
            file_size=self.storage_requested,
            excess_size=self.storage_excess,
            storage_free=self.storage_free,
            storage_limit=self.storage_limit,
        )
