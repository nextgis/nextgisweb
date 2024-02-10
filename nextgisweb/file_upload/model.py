import pickle
from pathlib import Path
from typing import Optional, Tuple, Union, overload

from msgspec import UNSET, Meta, Struct, UnsetType
from typing_extensions import Annotated
from ulid import ULID

from nextgisweb.env import env, gettext

from nextgisweb.core.exception import ValidationError
from nextgisweb.file_storage import FileObj

FileUploadID = Annotated[
    str,
    Meta(
        pattern="^([0-9a-f][0-9a-f]){16}$",
        description="File upload ID",
        extra=dict(route_pattern=r"([0-9a-f][0-9a-f]){16}"),
    ),
]


class FileUploadRef(Struct, kw_only=True):
    id: FileUploadID

    def __call__(self) -> "FileUpload":
        return FileUpload(id=self.id)


class FileUpload:
    id: FileUploadID
    size: int
    name: Optional[str]
    mime_type: Optional[str]
    incomplete: bool

    data_path: Path
    meta_path: Path

    @overload
    def __init__(self, src: dict, *, incomplete_ok=False):
        """Create new or read existing FileUpload"""

    @overload
    def __init__(
        self,
        *,
        size: int,
        name: Optional[str] = None,
        mime_type: Optional[str] = None,
        incomplete: bool = False,
    ):
        """Create new FileUpload"""

    @overload
    def __init__(self, *, id: FileUploadID, incomplete_ok=False):
        """Read exitsing FileUpload"""

    def __init__(
        self,
        src: Union[dict, UnsetType] = UNSET,
        *,
        id: Union[FileUploadID, UnsetType] = UNSET,
        incomplete_ok: bool = False,
        **kwargs,
    ):
        if src is not UNSET:
            self.__init__(**src, incomplete_ok=incomplete_ok)
            return

        if invalid := (set(kwargs.keys()) - {"size", "name", "mime_type", "incomplete"}):
            raise ValueError(f"Invalid keyword args: {','.join(invalid)}")

        create = id is UNSET
        self.id = ULID().hex if create else id
        self.data_path, self.meta_path = _filenames(self.id, makedirs=create)

        if create:
            self.size = kwargs["size"]
            self.name = kwargs.get("name", None)
            self.mime_type = kwargs.get("mime_type")
            self.incomplete = kwargs.get("incomplete", False)
            self.__dict__.update(kwargs)
            return

        if not self.meta_path.exists() or not self.data_path.exists():
            raise FileUploadNotFound

        self.read_meta()

        if not incomplete_ok and self.incomplete:
            raise FileUploadNotCompleted

    def read_meta(self):
        meta = pickle.loads(self.meta_path.read_bytes())
        self.size = meta["size"]
        self.name = meta.get("name")
        self.mime_type = meta.get("mime_type")
        self.incomplete = meta.get("incomplete", False)

    def write_meta(self):
        meta = dict(id=self.id, size=self.size)

        if self.name:
            meta.update(name=self.name)

        if self.mime_type:
            meta.update(mime_type=self.mime_type)

        if self.incomplete:
            meta.update(incomplete=self.incomplete)
        else:
            assert self.mime_type

        self.meta_path.write_bytes(pickle.dumps(meta))

    def to_fileobj(self, *, component: Optional[str] = None) -> FileObj:
        component = FileObj.component_from_stack(1) if component is None else component
        return FileObj(component=component).copy_from(self.data_path)


def _filenames(id: FileUploadID, makedirs=False) -> Tuple[Path, Path]:
    ulid = ULID.from_hex(id)
    levels = (ulid.datetime.strftime(r"%Y-%m-%d"), id[-2:], id[-4:-2])
    level_path = Path(env.file_upload.path, *levels)

    # Create folders if needed
    if makedirs and not level_path.is_dir():
        level_path.mkdir(parents=True, exist_ok=True)

    base = level_path / id
    return (base.with_suffix(".data"), base.with_suffix(".meta"))


class FileUploadNotFound(ValidationError):
    title = gettext("Uploaded file not found")


class FileUploadNotCompleted(ValidationError):
    title = gettext("Upload is not completed")
