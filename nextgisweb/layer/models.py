# -*- coding: utf-8 -*-
import sqlalchemy as sa
import sqlalchemy.orm as orm

from ..registry import registry_maker
from ..models import Base
from ..spatial_ref_sys import SRSMixin


def initialize(comp):
    LayerGroup = comp.env.layer_group.LayerGroup
    ACLMixin = comp.env.security.ACLMixin

    class Layer(ACLMixin, Base):
        __tablename__ = 'layer'

        __acl_resource__ = 'layer'
        __acl_parent_attr__ = 'layer_group'

        id = sa.Column(sa.Integer, primary_key=True)
        keyname = sa.Column(sa.Unicode, unique=True)
        layer_group_id = sa.Column(sa.Integer, sa.ForeignKey(LayerGroup.id), nullable=False)
        cls = sa.Column(sa.Unicode, nullable=False)
        display_name = sa.Column(sa.Unicode, nullable=False)
        description = sa.Column(sa.Unicode)

        identity = __tablename__
        registry = registry_maker()

        __mapper_args__ = {
            'polymorphic_identity': identity,
            'polymorphic_on': cls
        }

        layer_group = orm.relationship(
            LayerGroup, uselist=False,
            backref=orm.backref('layers', order_by=display_name, cascade="all")
        )

        def __unicode__(self):
            return self.display_name

        @property
        def parent(self):
            return self.layer_group

        @property
        def parents(self):
            return self.layer_group.parents + (self.layer_group, )

        def get_info(self):
            s = super(Layer, self)
            return (s.get_info() if hasattr(s, 'get_info') else ()) + (
                (u"Тип слоя", self.cls_display_name),
            )

    comp.Layer = Layer


class SpatialLayerMixin(SRSMixin):

    def get_info(self):
        s = super(SpatialLayerMixin, self)
        return (s.get_info() if hasattr(s, 'get_info') else ()) + (
            (u"Система координат", self.srs_id),
        )
