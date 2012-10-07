# -*- coding: utf-8 -*-
import sqlalchemy as sa
import sqlalchemy.orm as orm

from ..layer import Layer


@Layer.registry.register
class RasterLayer(Layer):
    __tablename__ = 'raster_layer'

    identity = __tablename__
    cls_display_name = u"Растровый слой"

    layer_id = sa.Column(sa.Integer, sa.ForeignKey(Layer.id), primary_key=True)

    __mapper_args__ = dict(
        polymorphic_identity=identity,
    )
