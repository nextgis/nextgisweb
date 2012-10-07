# -*- coding: utf-8 -*-
import sqlalchemy as sa
import sqlalchemy.orm as orm

from ..models.base import Base


class WebMap(Base):
    __tablename__ = 'webmap'

    id = sa.Column(sa.Integer, primary_key=True)
    display_name = sa.Column(sa.Unicode, nullable=False)
