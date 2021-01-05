# -*- coding: utf-8 -*-
from __future__ import division, absolute_import, print_function, unicode_literals

from ..models import declarative_base
from .. import db


Base = declarative_base()


class CState(Base):
    __tablename__ = 'core_cstate'

    component = db.Column(db.Unicode, primary_key=True)
    heads = db.Column(db.Unicode, nullable=False)


class Migration(Base):
    __tablename__ = 'core_migration'

    component = db.Column(db.Unicode, primary_key=True)
    revision = db.Column(db.Unicode, primary_key=True)


class Setting(Base):
    __tablename__ = 'setting'

    component = db.Column(db.Unicode, primary_key=True)
    name = db.Column(db.Unicode, primary_key=True)
    value = db.Column(db.Unicode, nullable=False)
