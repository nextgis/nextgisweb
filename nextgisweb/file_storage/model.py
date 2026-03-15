from __future__ import annotations

import io
import uuid
from pathlib import Path
from shutil import copyfile, copyfileobj
from typing import Any

import sqlalchemy as sa
import sqlalchemy.event as sa_event
from sqlalchemy.dialects import postgresql as pg
from sqlalchemy.orm import Mapped, mapped_column, relationship

from nextgisweb.env import Base, env
from nextgisweb.env.model import DBSession
from nextgisweb.env.package import pkginfo
from nextgisweb.lib.imptool import module_from_stack


def _size_default(context):
    params = context.get_current_parameters()
    if params.get("size") is None:
        fn = Path(env.file_storage.filename((params["component"], params["uuid"])))
        return fn.stat().st_size


class FileObj(Base):
    __tablename__ = "fileobj"

    id: Mapped[int] = mapped_column(primary_key=True)
    component: Mapped[str] = mapped_column()
    uuid: Mapped[str] = mapped_column(sa.String(32))
    size: Mapped[int] = mapped_column(sa.BigInteger, default=_size_default)

    __table_args__ = (sa.Index("fileobj_uuid_component_idx", uuid, component, unique=True),)

    _meta: Mapped[FileMeta | None] = relationship(back_populates="fileobj", cascade="delete")

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
        comp_id = pkginfo.component_by_module(mod)
        assert comp_id and comp_id not in ("file_storage", "file_upload")
        return comp_id

    def filename(self, *, makedirs=False, not_exists=False) -> Path:
        result = Path(env.file_storage.filename(self, makedirs=makedirs))
        assert not (not_exists and result.exists())
        return result

    def copy_from(self, source: Path | str | Any) -> FileObj:
        dest = self.filename(makedirs=True, not_exists=True)
        if isinstance(source, (str, Path)):
            copyfile(source, dest)
        else:
            with io.open(dest, "wb") as fd:
                copyfileobj(source, fd)
        self.size = dest.stat().st_size
        return self

    def from_content(self, content: bytes) -> FileObj:
        with io.open(self.filename(makedirs=True, not_exists=True), "wb") as fd:
            fd.write(content)
        self.size = len(content)
        return self

    @property
    def meta(self):
        if obj := self._meta:
            return obj.value

    @meta.setter
    def meta(self, value):
        if obj := self._meta:
            if value is not None:
                obj.value = value
            else:
                DBSession.delete(obj)
        elif value is not None:
            FileMeta(fileobj=self, value=value).persist()


class FileMeta(Base):
    __tablename__ = "filemeta"

    fileobj_id: Mapped[int] = mapped_column(
        sa.ForeignKey("fileobj.id", ondelete="cascade"), primary_key=True
    )
    value: Mapped[dict[str, Any]] = mapped_column(pg.JSONB)

    fileobj: Mapped[FileObj] = relationship(back_populates="_meta")


@sa_event.listens_for(FileObj, "before_insert")
def fileobj_before_insert(mapper, connection, obj):
    assert obj.filename().is_file(), "File not written"
