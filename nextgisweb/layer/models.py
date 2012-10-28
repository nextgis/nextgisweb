# -*- coding: utf-8 -*-
import sqlalchemy as sa
import sqlalchemy.orm as orm

from ..registry import registry_maker
from ..models import Base
from ..security import ACL


class Layer(Base):
    __tablename__ = 'layer'

    id = sa.Column(sa.Integer, primary_key=True)
    keyname = sa.Column(sa.Unicode, unique=True)
    layer_group_id = sa.Column(sa.Integer, sa.ForeignKey('layer_group.id'), nullable=False)
    acl_id = sa.Column(sa.Integer, sa.ForeignKey(ACL.id), nullable=False)
    default_style_id = sa.Column(sa.Integer, sa.ForeignKey('style.id', use_alter=True, name='fk_layer_default_style'))
    cls = sa.Column(sa.Unicode, nullable=False)
    display_name = sa.Column(sa.Unicode, nullable=False)
    description = sa.Column(sa.Unicode, default=u'', nullable=False)

    acl = orm.relationship(ACL, cascade='all')
    default_style = orm.relationship(
        'Style',
        primaryjoin='Style.id == Layer.default_style_id'
    )

    identity = __tablename__
    registry = registry_maker()

    __mapper_args__ = {
        'polymorphic_identity': identity,
        'polymorphic_on': cls
    }

    layer_group = orm.relationship(
        'LayerGroup', uselist=False,
        backref=orm.backref('layers', uselist=True)
    )

    def __init__(self, *args, **kwargs):
        if not 'acl' in kwargs and not 'acl_id' in kwargs:
            kwargs['acl'] = ACL()
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
        return (
            (u"Тип слоя", self.cls_display_name),
        )
