# -*- coding: utf-8 -*-
import sqlalchemy as sa
import sqlalchemy.orm as orm

from ..models import declarative_base
from ..layer import Layer

Base = declarative_base()


class FeatureDescription(Base):
    __tablename__ = 'feature_description'

    layer_id = sa.Column(sa.ForeignKey(Layer.id), primary_key=True)
    feature_id = sa.Column(sa.Integer, primary_key=True)
    value = sa.Column(sa.Unicode)

    layer = orm.relationship(
        Layer,
        backref=orm.backref('__feature_description', cascade='all')
    )
