# -*- coding: utf-8 -*-
import sqlalchemy as sa
import sqlalchemy.orm as orm

from ..registry import registry_maker
from ..models import Base
from ..layer import Layer


class Style(Base):
    __tablename__ = 'style'

    id = sa.Column(sa.Integer, primary_key=True)
    layer_id = sa.Column(sa.Integer, sa.ForeignKey(Layer.id), nullable=False)
    cls = sa.Column(sa.Unicode, nullable=False)
    display_name = sa.Column(sa.Unicode, nullable=False)

    identity = __tablename__
    registry = registry_maker()

    __mapper_args__ = {
        'polymorphic_identity': identity,
        'polymorphic_on': cls
    }

    layer = orm.relationship('Layer', backref=orm.backref('styles'))

    def __unicode__(self):
        return self.display_name

    @property
    def parent(self):
        return self.layer

    @classmethod
    def is_layer_supported(cls, layer):
        """ Проверяет, возможна ли отрисовка слоя layer стилем этого класса """
        return False

    def render_image(cls, layer, extent, image_size):
        """ Рендеринг картинки """
        pass