import uuid

import sqlalchemy as sa

from ..models import declarative_base

Base = declarative_base()


class FileObj(Base):
    __tablename__ = 'fileobj'

    id = sa.Column(sa.Integer, primary_key=True)
    component = sa.Column(sa.Unicode, nullable=False)
    uuid = sa.Column(sa.Unicode(32), nullable=False)

    __table_args__ = (
        sa.Index('fileobj_uuid_component_idx', uuid, component, unique=True),
    )

    def __init__(self, *args, **kwargs):
        Base.__init__(self, *args, **kwargs)
        self.uuid = uuid.uuid4().hex
