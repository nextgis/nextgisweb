import os

from nextgisweb.env import Component

from .model import Tileset, TilesetData


class TilesetComponent(Component):
    def setup_pyramid(self, config):
        from . import api, view

        api.setup_pyramid(self, config)
        view.setup_pyramid(self, config)

    def estimate_storage(self):
        for resource in Tileset.query():
            fn = self.env.file_storage.filename(resource.fileobj)
            size = os.stat(fn).st_size
            yield TilesetData, resource.id, size
