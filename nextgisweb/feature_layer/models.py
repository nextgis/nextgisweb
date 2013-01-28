# -*- coding: utf-8 -*-
import sqlalchemy as sa
import sqlalchemy.orm as orm
from sqlalchemy.ext.declarative import declared_attr
from sqlalchemy.ext.orderinglist import ordering_list

from ..models import Base
from ..layer import Layer

from .interface import FIELD_TYPE


class LayerField(Base):
    __tablename__ = 'layer_field'

    id = sa.Column(sa.Integer, primary_key=True)
    layer_id = sa.Column(sa.Integer, sa.ForeignKey(Layer.id), nullable=False)
    cls = sa.Column(sa.Unicode, nullable=False)

    idx = sa.Column(sa.Integer, nullable=False)
    keyname = sa.Column(sa.Unicode, nullable=False)
    datatype = sa.Column(sa.Enum(*FIELD_TYPE.enum, native_enum=False), nullable=False)
    display_name = sa.Column(sa.Unicode, nullable=False)
    grid_visibility = sa.Column(sa.Boolean, nullable=False, default=True)

    identity = __tablename__

    __mapper_args__ = {
        'polymorphic_identity': identity,
        'polymorphic_on': cls
    }

    layer = orm.relationship(
        'Layer',
        primaryjoin=(Layer.id == layer_id),
    )

    def __unicode__(self):
        return self.display_name

    def to_dict(self):
        return dict([
            (c, getattr(self, c))
            for c in (
                'id', 'layer_id', 'cls',
                'idx', 'keyname', 'datatype',
                'display_name', 'grid_visibility',
            )
        ])


class LayerFieldsMixin(object):
    @declared_attr
    def fields(cls):
        return orm.relationship(
            'LayerField',
            order_by=LayerField.idx,
            collection_class=ordering_list('idx'),
            cascade='all'
        )
