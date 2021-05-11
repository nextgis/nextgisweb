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


storage_stat_dimension = db.Table(
    'core_storage_stat_dimension', Base.metadata,
    db.Column('timestamp', db.TIMESTAMP, nullable=False),
    db.Column('component', db.Unicode),
    db.Column('kind_of_data', db.Unicode),
    db.Column('resource_id', db.Integer),
    db.Column('value_data_volume', db.Integer),
)


storage_stat_dimension_total = db.Table(
    'core_storage_stat_dimension_total', Base.metadata,
    db.Column('timestamp', db.TIMESTAMP, nullable=False),
    db.Column('kind_of_data', db.Unicode),
    db.Column('value_data_volume', db.Integer),
)


storage_stat_delta = db.Table(
    'core_storage_stat_delta', Base.metadata,
    db.Column('timestamp', db.TIMESTAMP, nullable=False),
    db.Column('component', db.Unicode),
    db.Column('kind_of_data', db.Unicode),
    db.Column('resource_id', db.Integer),
    db.Column('value_data_volume', db.Integer),
)


storage_stat_delta_total = db.Table(
    'core_storage_stat_delta_total', Base.metadata,
    db.Column('timestamp', db.TIMESTAMP, nullable=False),
    db.Column('kind_of_data', db.Unicode),
    db.Column('value_data_volume', db.Integer),
)
