from __future__ import annotations

import os
import os.path
import uuid
from operator import itemgetter
from pathlib import Path
from shutil import copyfile, copyfileobj
from typing import Any, BinaryIO

import sqlalchemy as sa
import sqlalchemy.event as sa_event
from sqlalchemy.orm import Mapped, mapped_column

from nextgisweb.env import Base, inject
from nextgisweb.env.package import pkginfo
from nextgisweb.lib.imptool import module_from_stack
from nextgisweb.lib.logging import logger

from nextgisweb.core import BackupBase
from nextgisweb.core.backup import BackupObjectsResult, backup_objects_hook

from .component import FileStorageComponent


def _size_default(context):
    from .component import FileStorageComponent

    params = context.get_current_parameters()
    if params.get("size") is None:
        fn = Path(FileStorageComponent.current().filename((params["component"], params["uuid"])))
        return fn.stat().st_size


class FileObj(Base):
    __tablename__ = "fileobj"

    id: Mapped[int] = mapped_column(primary_key=True)
    component: Mapped[str] = mapped_column()
    uuid: Mapped[str] = mapped_column(sa.String(32))
    size: Mapped[int] = mapped_column(sa.BigInteger, default=_size_default)

    __table_args__ = (sa.Index("fileobj_uuid_component_idx", uuid, component, unique=True),)

    def __init__(self, *args, **kwargs):
        if "component" not in kwargs:
            comp_id = self.component_from_stack(kwargs.pop("stacklevel", 0))
            kwargs["component"] = comp_id

        Base.__init__(self, *args, **kwargs)
        self.uuid = uuid.uuid4().hex

    @classmethod
    def component_from_stack(cls, stacklevel=0):
        mod = module_from_stack(
            stacklevel,
            skip=(
                "nextgisweb.file_storage.",
                "sqlalchemy.",
            ),
        )
        comp_id = pkginfo.component_by_module(mod, required=True)
        assert comp_id not in ("file_storage", "file_upload")
        return comp_id

    def filename(self, *, makedirs=False, not_exists=False) -> Path:
        from .component import FileStorageComponent

        result = Path(FileStorageComponent.current().filename(self, makedirs=makedirs))
        assert not (not_exists and result.exists())
        return result

    def copy_from(self, source: Path | str | Any) -> FileObj:
        dest = self.filename(makedirs=True, not_exists=True)
        if isinstance(source, (str, Path)):
            copyfile(source, dest)
        else:
            with open(dest, "wb") as fd:
                copyfileobj(source, fd)
        self.size = dest.stat().st_size
        return self

    def from_content(self, content: bytes) -> FileObj:
        with open(self.filename(makedirs=True, not_exists=True), "wb") as fd:
            fd.write(content)
        self.size = len(content)
        return self


BUF_SIZE = 1 << 20  # 1 MiB


class FileObjBackup(BackupBase):
    identity = "fileobj"
    blob = True

    plget = itemgetter("component", "uuid")

    @inject()
    def backup(self, dst: BinaryIO, *, component: FileStorageComponent = inject.arg()) -> None:
        with open(component.filename(self.plget(self.payload)), "rb") as fd:
            copyfileobj(fd, dst, length=BUF_SIZE)

    @inject()
    def restore(self, src: BinaryIO, *, component: FileStorageComponent = inject.arg()) -> None:
        fn = component.filename(self.plget(self.payload), makedirs=True)
        if os.path.isfile(fn):
            logger.debug(
                "Skipping restoration of fileobj %s: file already exists!", self.payload["uuid"]
            )
        else:
            with open(fn, "wb") as fd:
                copyfileobj(src, fd, length=BUF_SIZE)


@backup_objects_hook()
def backup_objects(comp: FileStorageComponent) -> BackupObjectsResult:
    return (
        FileObjBackup(dict(component=fileobj.component, uuid=fileobj.uuid))
        for fileobj in FileObj.query().order_by(FileObj.component, FileObj.uuid)
    )


@sa_event.listens_for(FileObj, "before_insert")
def fileobj_before_insert(mapper, connection, obj):
    assert obj.filename().is_file(), "File not written"
