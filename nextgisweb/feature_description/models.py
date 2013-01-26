# -*- coding: utf-8 -*-
import sqlalchemy as sa
import sqlalchemy.orm as orm


def initialize(comp):
    Base = comp.env.core.Base

    class FeatureDescription(Base):
        __tablename__ = 'feature_description'

        layer_id = sa.Column(sa.Integer, sa.ForeignKey('layer.id'), primary_key=True)
        feature_id = sa.Column(sa.Integer, primary_key=True)
        value = sa.Column(sa.Unicode)

    comp.FeatureDescription = FeatureDescription
