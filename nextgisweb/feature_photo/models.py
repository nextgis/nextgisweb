# -*- coding: utf-8 -*-
import sqlalchemy as sa
import sqlalchemy.orm as orm

def initialize(comp):
    Base = comp.env.core.Base

    class FeaturePhoto(Base):
        __tablename__ = 'feature_photo'

        id = sa.Column(sa.Integer, primary_key=True)
        layer_id = sa.Column(sa.Integer, sa.ForeignKey('layer.id'), nullable=False)
        feature_id = sa.Column(sa.Integer, nullable=False)
        fileobj_id = sa.Column(sa.Integer, sa.ForeignKey('fileobj.id'), nullable=False)

        fileobj = orm.relationship('FileObj')

    comp.FeaturePhoto = FeaturePhoto
