from __future__ import annotations

import io
import uuid
from pathlib import Path
from shutil import copyfile, copyfileobj
from typing import Any, Union

import sqlalchemy as sa
import sqlalchemy.event as sa_event

from nextgisweb.env import Base, env
from nextgisweb.env.package import pkginfo
from nextgisweb.lib.imptool import module_from_stack


def _size_default(context):
    params = context.get_current_parameters()
    if params.get("size") is None:
        fn = Path(env.file_storage.filename((params["component"], params["uuid"])))
        return fn.stat().st_size


class FileObj(Base):
    __tablename__ = "fileobj"

    id = sa.Column(sa.Integer, primary_key=True)
    component = sa.Column(sa.Unicode, nullable=False)
    uuid = sa.Column(sa.Unicode(32), nullable=False)
    size = sa.Column(sa.BigInteger, nullable=False, default=_size_default)

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
        comp_id = pkginfo.component_by_module(mod)
        assert comp_id and comp_id not in ("file_storage", "file_upload")
        return comp_id

    def filename(self, *, makedirs=False, not_exists=False) -> Path:
        result = Path(env.file_storage.filename(self, makedirs=makedirs))
        assert not (not_exists and result.exists())
        return result

    def copy_from(self, source: Union[Path, str, Any]) -> FileObj:
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


@sa_event.listens_for(FileObj, "before_insert")
def fileobj_before_insert(mapper, connection, obj):
    assert obj.filename().is_file(), "File not written"
