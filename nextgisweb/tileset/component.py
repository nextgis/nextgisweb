from nextgisweb.env import Component

from .model import Tileset, TilesetData


class TilesetComponent(Component):
    def setup_pyramid(self, config):
        from . import api, view

        api.setup_pyramid(self, config)
        view.setup_pyramid(self, config)

    def estimate_storage(self):
        for resource in Tileset.query():
            size = resource.fileobj.filename().stat().st_size
            yield TilesetData, resource.id, size
