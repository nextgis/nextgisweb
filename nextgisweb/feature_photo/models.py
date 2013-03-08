# -*- coding: utf-8 -*-
import sqlalchemy as sa
import sqlalchemy.orm as orm


def initialize(comp):
    Base = comp.env.core.Base
    Layer = comp.env.layer.Layer
    FileObj = comp.env.file_storage.FileObj

    class FeaturePhoto(Base):
        __tablename__ = 'feature_photo'

        id = sa.Column(sa.Integer, primary_key=True)
        layer_id = sa.Column(sa.ForeignKey(Layer.id), nullable=False)
        feature_id = sa.Column(sa.Integer, nullable=False)
        fileobj_id = sa.Column(sa.ForeignKey(FileObj.id), nullable=False)

        fileobj = orm.relationship(FileObj)

        layer = orm.relationship(
            Layer,
            backref=orm.backref('__feature_photo', cascade='all')
        )

    comp.FeaturePhoto = FeaturePhoto
