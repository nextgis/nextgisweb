# -*- coding: utf-8 -*-
import sqlalchemy as sa
import sqlalchemy.orm as orm

from ..style import Style


@Style.registry.register
class MapnikStyle(Style):
    __tablename__ = 'mapnik_style'

    identity = __tablename__
    cls_display_name = u"Mapnik"

    style_id = sa.Column(sa.Integer, sa.ForeignKey('style.id'), primary_key=True)

    __mapper_args__ = dict(
        polymorphic_identity=identity,
    )

    @classmethod
    def is_layer_supported(cls, layer):
        return layer.cls == 'vector_layer'

    def render_image(self, layer, extent, img_size):
        pass
