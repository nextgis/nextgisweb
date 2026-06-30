from nextgisweb.env import Component, require

from .model import PointCloud, PointCloudData, estimate_point_cloud_data


class PointCloudComponent(Component):
    @require("file_upload")
    def setup_pyramid(self, config):
        from . import api, view

        view.setup_pyramid(self, config)
        api.setup_pyramid(self, config)

    def estimate_storage(self):
        for resource in PointCloud.query():
            size = estimate_point_cloud_data(resource)
            if size:
                yield PointCloudData, resource.id, size
