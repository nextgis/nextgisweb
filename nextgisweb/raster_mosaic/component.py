from nextgisweb.env import Component


class RasterMosaicComponent(Component):

    def setup_pyramid(self, config):
        from . import api, view  # NOQA: F401
        api.setup_pyramid(self, config)

    def workdir_filename(self, fobj, makedirs=False):
        return self.env.file_storage.workdir_filename(self, fobj, makedirs)
