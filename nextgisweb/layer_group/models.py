# -*- coding: utf-8 -*-
import sqlalchemy as sa
import sqlalchemy.orm as orm


def initialize(comp):
    Base = comp.env.core.Base
    ACL = comp.env.security.ACL

    class LayerGroup(Base):
        __tablename__ = 'layer_group'
        __table_args__ = (
            sa.CheckConstraint('(id = 0 AND parent_id IS NULL) OR (id <> 0 AND parent_id IS NOT NULL)'),
        )

        cls_display_name = u"Группа слоёв"

        id = sa.Column(sa.Integer, primary_key=True)
        parent_id = sa.Column(sa.Integer, sa.ForeignKey('layer_group.id', ondelete='restrict'))
        keyname = sa.Column(sa.Unicode, unique=True)
        acl_id = sa.Column(sa.Integer, sa.ForeignKey(ACL.id), nullable=False)
        display_name = sa.Column(sa.Unicode, nullable=False)
        description = sa.Column(sa.Unicode, default=u'', nullable=False)

        parent = orm.relationship(
            'LayerGroup', remote_side=[id],
            backref=orm.backref('children', order_by=display_name, cascade="all")
        )
        acl = orm.relationship('ACL', cascade='all', lazy='joined')

        def __init__(self, *args, **kwargs):
            if not 'acl' in kwargs and not 'acl_id' in kwargs:
                if 'parent' in kwargs:
                    parent_acl = kwargs['parent'].acl
                kwargs['acl'] = ACL(
                    parent=parent_acl,
                    resource='layer_group'
                )
            Base.__init__(self, *args, **kwargs)

        def __unicode__(self):
            return self.display_name

        @property
        def parents(self):
            return (self.parent.parents + (self.parent, )) if self.parent else ()

    comp.LayerGroup = LayerGroup
