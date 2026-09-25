from nextgisweb.env import Component, require


class PointCloudComponent(Component):
    @require("file_upload")
    def setup_pyramid(self, config):
        from . import api, view

        view.setup_pyramid(self, config)
        api.setup_pyramid(self, config)
