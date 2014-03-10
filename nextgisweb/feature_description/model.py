# -*- coding: utf-8 -*-
import sqlalchemy as sa
import sqlalchemy.orm as orm

from ..models import declarative_base
from ..resource import Resource

Base = declarative_base()


class FeatureDescription(Base):
    __tablename__ = 'feature_description'

    layer_id = sa.Column(sa.ForeignKey(Resource.id), primary_key=True)
    feature_id = sa.Column(sa.Integer, primary_key=True)
    value = sa.Column(sa.Unicode)

    layer = orm.relationship(Resource, backref=orm.backref(
        '__feature_description', cascade='all'))
