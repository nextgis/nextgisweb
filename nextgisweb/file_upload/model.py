import pickle
from pathlib import Path
from typing import Optional, Tuple

from msgspec import Meta
from typing_extensions import Annotated

from nextgisweb.env import env, gettext

from nextgisweb.core.exception import ValidationError
from nextgisweb.file_storage import FileObj

FileId = Annotated[str, Meta(min_length=32, max_length=32, pattern="^[0-9a-f]{32}$")]


class FileUpload:
    id: FileId
    size: int
    name: str
    mime_type: str

    data_path: Path
    meta_path: Path

    def __init__(self, src=None, *, id: Optional[FileId] = None, **kwargs):
        if src is not None:
            self.__init__(**src)
            return

        if invalid := (set(kwargs.keys()) - {"size", "name", "mime_type"}):
            raise ValueError(f"Invalid keyword args: {','.join(invalid)}")

        self.data_path, self.meta_path = _filenames(id)
        if not self.meta_path.exists() or not self.data_path.exists():
            raise FileUploadNotFound

        meta = pickle.loads(self.meta_path.read_bytes())
        if "incomplete" in meta:
            raise FileUploadNotCompleted

        self.__dict__.update(meta)

    def to_fileobj(self, *, component: str) -> FileObj:
        return FileObj(component=component).copy_from(self.data_path)


def _filenames(id: FileId) -> Tuple[Path, Path]:
    fd, fm = env.file_upload.get_filename(id, makedirs=False)
    return Path(fd), Path(fm)


class FileUploadNotFound(ValidationError):
    title = gettext("Uploaded file not found")


class FileUploadNotCompleted(ValidationError):
    title = gettext("Upload is not completed")
