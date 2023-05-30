from ..env import Component

from .model import Base


class LookupTableComponent(Component):
    identity = 'lookup_table'
    metadata = Base.metadata

    def setup_pyramid(self, config):
        from . import view  # NOQA
        view.setup_pyramid(self, config)
