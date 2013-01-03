# -*- coding: utf-8 -*-
import uuid

import sqlalchemy as sa
import sqlalchemy.orm as orm

from ..models import Base


class FileObj(Base):
    __tablename__ = 'fileobj'

    id = sa.Column(sa.Integer, primary_key=True)
    component = sa.Column(sa.Unicode, nullable=False)
    uuid = sa.Column(sa.Unicode(32), nullable=False)

    def __init__(self, *args, **kwargs):
    	Base.__init__(self, *args, **kwargs)
    	self.uuid = str(uuid.uuid4().hex)
