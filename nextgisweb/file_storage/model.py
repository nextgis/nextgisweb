from __future__ import annotations

import io
import uuid
from pathlib import Path
from shutil import copyfile
from typing import Union

import sqlalchemy as sa

from nextgisweb.env import Base, env


class FileObj(Base):
    __tablename__ = "fileobj"

    id = sa.Column(sa.Integer, primary_key=True)
    component = sa.Column(sa.Unicode, nullable=False)
    uuid = sa.Column(sa.Unicode(32), nullable=False)

    __table_args__ = (sa.Index("fileobj_uuid_component_idx", uuid, component, unique=True),)

    def __init__(self, *args, **kwargs):
        Base.__init__(self, *args, **kwargs)
        self.uuid = uuid.uuid4().hex

    def filename(self, *, makedirs=False) -> Path:
        return Path(env.file_storage.filename(self, makedirs=makedirs))

    def copy_from(self, source: Union[Path, str]) -> FileObj:
        copyfile(source, self.filename(makedirs=True))
        return self

    def from_content(self, content: bytes) -> FileObj:
        with io.open(self.filename(makedirs=True), "wb") as fd:
            fd.write(content)
        return self
