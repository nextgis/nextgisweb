# -*- coding: utf-8 -*-
from __future__ import division, absolute_import, print_function, unicode_literals

from .. import db
from ..models import declarative_base
from ..resource import Resource

Base = declarative_base()


class FeatureDescription(Base):
    __tablename__ = 'feature_description'

    resource_id = db.Column(db.ForeignKey(Resource.id), primary_key=True)
    feature_id = db.Column(db.Integer, primary_key=True)
    value = db.Column(db.Unicode, nullable=False)

    resource = db.relationship(Resource, backref=db.backref(
        '__feature_description', cascade='all'))
