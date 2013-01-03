# -*- coding: utf-8 -*-
import sqlalchemy as sa
import sqlalchemy.orm as orm

from ..models import Base


class FileObj(Base):
    __tablename__ = 'fileobj'

    id = sa.Column(sa.Integer, primary_key=True)
    component = sa.Column(sa.Unicode, nullable=False)
