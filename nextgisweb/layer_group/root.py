# -*- coding: utf-8 -*-
from ..component import Component

from ..layer_group import LayerGroup
from ..security import ACL, ACLItem
from ..auth import User


@Component.registry.register
class LayerGroupRootComponent(Component):
    identity = 'layer_group_root'

    @classmethod
    def initialize_db(cls, dbsession):
        administrator = dbsession.query(User).filter_by(keyname='administrator').one()
        owner = dbsession.query(User).filter_by(keyname='owner').one()
        root = LayerGroup(
            id=0,
            acl=ACL(
                user=administrator,
                scope_keyname='layer_group',
                items=[
                    ACLItem(principal=administrator, category_keyname='layer_group', permission_keyname='*'),
                    ACLItem(principal=administrator, category_keyname='layer', permission_keyname='*'),
                    ACLItem(principal=owner, category_keyname='layer_group', permission_keyname='*'),
                    ACLItem(principal=owner, category_keyname='layer', permission_keyname='*'),
                ]
            ),
            display_name=u"Основная группа слоёв")
        dbsession.add(root)

    @classmethod
    def setup_routes(cls, config):
        pass
