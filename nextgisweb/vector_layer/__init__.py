# -*- coding: utf-8 -*-
from ..component import Component, require
from ..core import BackupBase, TableBackup

from .models import TableInfo


@BackupBase.registry.register
class VectorLayerBackup(BackupBase):
    identity = 'vector_layer'

    def backup(self):
        pass

    def restore(self):
        conn = self.comp.env.core.DBSession.connection()
        layer = self.comp.VectorLayer.filter_by(layer_id=self.key).one()
        tableinfo = TableInfo.from_layer(layer)
        tableinfo.setup_metadata(tablename=layer._tablename)
        tableinfo.metadata.create_all(conn)


@Component.registry.register
class VectorLayerComponent(Component):
    identity = 'vector_layer'

    def initialize(self):
        from . import models
        models.initialize(self)

    @require('feature_layer')
    def setup_pyramid(self, config):
        from . import views
        views.setup_pyramid(self, config)

    def backup(self):
        for i in super(VectorLayerComponent, self).backup():
            yield i

        for l in self.VectorLayer.query():
            yield VectorLayerBackup(self, l.layer_id)
            yield TableBackup(self, 'vector_layer.' + l._tablename)
