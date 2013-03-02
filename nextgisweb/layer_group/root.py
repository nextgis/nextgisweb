# -*- coding: utf-8 -*-
from sqlalchemy.orm.exc import NoResultFound
from ..component import Component, require
from ..security import PERMISSION_ALL


@Component.registry.register
class LayerGroupRootComponent(Component):
    identity = 'layer_group_root'

    @require('layer_group', 'security', 'auth')
    def initialize_db(self):
        User = self.env.auth.User
        Group = self.env.auth.Group

        LayerGroup = self.env.layer_group.LayerGroup

        admins = Group.filter_by(keyname='administrators').one()
        admin = User.filter_by(keyname='administrator').one()
        owner = User.filter_by(keyname='owner').one()

        try:
            LayerGroup.filter_by(id=0).one()
        except NoResultFound:
            root = LayerGroup(
                id=0,
                owner_user=admin,
                display_name=u"Основная группа слоёв"
            ).persist()

            root.acl.update((
                (admins.id, 'layer_group', PERMISSION_ALL, 'allow-subtree'),
                (owner.id, 'layer_group', PERMISSION_ALL, 'allow-subtree'),
            ))
