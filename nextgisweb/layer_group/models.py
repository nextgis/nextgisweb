# -*- coding: utf-8 -*-
import sqlalchemy as sa
import sqlalchemy.orm as orm


def initialize(comp):
    Base = comp.env.core.Base
    ACLMixin = comp.env.security.ACLMixin

    class LayerGroup(ACLMixin, Base):
        __tablename__ = 'layer_group'
        __table_args__ = (
            sa.CheckConstraint('(id = 0 AND parent_id IS NULL) OR (id <> 0 AND parent_id IS NOT NULL)'),
        )

        cls_display_name = u"Группа слоёв"

        __acl_resource__ = 'layer_group'
        __acl_parent_attr__ = 'parent'

        id = sa.Column(sa.Integer, primary_key=True)
        parent_id = sa.Column(sa.Integer, sa.ForeignKey('layer_group.id', ondelete='restrict'))
        keyname = sa.Column(sa.Unicode, unique=True)
        display_name = sa.Column(sa.Unicode, nullable=False)
        description = sa.Column(sa.Unicode, default=u'', nullable=False)

        parent = orm.relationship(
            'LayerGroup', remote_side=[id],
            backref=orm.backref('children', order_by=display_name, cascade="all")
        )

        def __unicode__(self):
            return self.display_name

        @property
        def parents(self):
            return (self.parent.parents + (self.parent, )) if self.parent else ()

    comp.LayerGroup = LayerGroup
