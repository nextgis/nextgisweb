from nextgisweb.env import COMP_ID, Component, require

from .model import Base


class ResMetaComponent(Component):
    identity = COMP_ID
    metadata = Base.metadata

    @require('resource')
    def setup_pyramid(self, config):
        from . import view  # NOQA
        view.setup_pyramid(self, config)
