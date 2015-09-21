# -*- coding: utf-8 -*-
from ..component import Component, require
from ..core import BackupBase, TableBackup

from .model import Base, TableInfo, VectorLayer


@BackupBase.registry.register
class VectorLayerBackup(BackupBase):
    identity = 'vector_layer'

    def backup(self):
        pass

    def restore(self):
        conn = self.comp.env.core.DBSession.connection()
        layer = VectorLayer.filter_by(id=self.key).one()
        tableinfo = TableInfo.from_layer(layer)
        tableinfo.setup_metadata(tablename=layer._tablename)
        tableinfo.metadata.create_all(conn)


@Component.registry.register
class VectorLayerComponent(Component):
    identity = 'vector_layer'
    metadata = Base.metadata

    @require('feature_layer')
    def setup_pyramid(self, config):
        from . import view

    def backup(self):
        for i in super(VectorLayerComponent, self).backup():
            yield i

        for l in VectorLayer.query():
            yield VectorLayerBackup(self, l.id)
            yield TableBackup(self, 'vector_layer.' + l._tablename)
