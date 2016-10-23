# -*- coding: utf-8 -*-
from __future__ import unicode_literals, print_function, absolute_import

from ..models import declarative_base
from .. import db


Base = declarative_base()


class Setting(Base):
    __tablename__ = 'setting'

    component = db.Column(db.Unicode, primary_key=True)
    name = db.Column(db.Unicode, primary_key=True)
    value = db.Column(db.Unicode, nullable=False)
