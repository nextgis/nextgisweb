# -*- coding: utf-8 -*-
from sqlalchemy.orm.exc import NoResultFound

from ..component import Component, require
from ..auth import User

from .models import LayerGroup


@Component.registry.register
class LayerGroupRootComponent(Component):
    identity = 'layer_group_root'

    @require('layer_group', 'security', 'auth')
    def initialize_db(self):
        admin = User.filter_by(keyname='administrator').one()

        try:
            LayerGroup.filter_by(id=0).one()
        except NoResultFound:
            LayerGroup(
                id=0,
                owner_user=admin,
                display_name=u"Основная группа слоёв"
            ).persist()
