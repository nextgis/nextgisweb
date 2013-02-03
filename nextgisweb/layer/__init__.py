# -*- coding: utf-8 -*-
from ..component import Component, require
from ..security import PERMISSION_ALL

from .models import SpatialLayerMixin
from . import views

@Component.registry.register
class LayerComponent(Component):
    identity = 'layer'

    @require('layer_group', 'security')
    def initialize(self):
        from . import models
        models.initialize(self)

        security = self.env.security

        security.add_resource('layer', label=u"Слой")

        security.add_permission('layer', 'data-read', label=u"Чтение данных")
        security.add_permission('layer', 'data-edit', label=u"Изменение данных")
        security.add_permission('layer', 'metadata-view', label=u"Чтение метаданных")
        security.add_permission('layer', 'metadata-edit', label=u"Изменение метаданных")

        security.add_resource_child('layer_group', 'layer')

    @require('layer_group_root', 'auth')
    def initialize_db(self):
        DBSession = self.env.core.DBSession
        LayerGroup = self.env.layer_group.LayerGroup
        User = self.env.auth.User
        Group = self.env.auth.Group

        root = DBSession.query(LayerGroup).filter_by(id=0).one()

        administrators = DBSession.query(Group).filter_by(keyname='administrators').one()
        root.acl.update((
            (administrators.id, 'layer', PERMISSION_ALL, 'allow-subtree'),
        ))

        owner = DBSession.query(User).filter_by(keyname='owner').one()
        root.acl.update((
            (owner.id, 'layer', PERMISSION_ALL, 'allow-subtree'),
        ))

    @require('layer_group')
    def setup_pyramid(self, config):
        from . import views
        views.setup_pyramid(self, config)
