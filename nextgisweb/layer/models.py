# -*- coding: utf-8 -*-
import sqlalchemy as sa
import sqlalchemy.orm as orm

from ..registry import registry_maker
from ..models import Base
from ..spatial_ref_sys import SRSMixin


def initialize(comp):
    LayerGroup = comp.env.layer_group.LayerGroup
    ACL = comp.env.security.ACL

    class Layer(Base):
        __tablename__ = 'layer'

        id = sa.Column(sa.Integer, primary_key=True)
        keyname = sa.Column(sa.Unicode, unique=True)
        layer_group_id = sa.Column(sa.Integer, sa.ForeignKey(LayerGroup.id), nullable=False)
        acl_id = sa.Column(sa.Integer, sa.ForeignKey('acl.id'), nullable=False)
        cls = sa.Column(sa.Unicode, nullable=False)
        display_name = sa.Column(sa.Unicode, nullable=False)
        description = sa.Column(sa.Unicode, default=u'', nullable=False)

        acl = orm.relationship('ACL', cascade='all')

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

        def __init__(self, *args, **kwargs):
            if not 'acl' in kwargs and not 'acl_id' in kwargs:
                if 'layer_group' in kwargs:
                    parent_acl = kwargs['layer_group'].acl
                kwargs['acl'] = ACL(
                    parent=parent_acl,
                    resource='layer'
                )
            Base.__init__(self, *args, **kwargs)

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
