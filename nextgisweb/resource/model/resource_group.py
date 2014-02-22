# -*- coding: utf-8 -*-
from __future__ import unicode_literals

import sqlalchemy as sa

from .resource import Resource, MetaDataScope


@Resource.registry.register
class ResourceGroup(MetaDataScope, Resource):

    identity = 'resource_group'
    cls_display_name = "Группа ресурсов"

    __tablename__ = identity
    __mapper_args__ = dict(polymorphic_identity=identity)

    resource_id = sa.Column(sa.ForeignKey(Resource.id), primary_key=True)

    def check_child(self, child):
        # Принимаем любые дочерние ресурсы
        return True

    @classmethod
    def check_parent(self, parent):
        # Группа может быть либо корнем, либо подгруппой в другой группе
        return (parent is None) or isinstance(parent, ResourceGroup)
