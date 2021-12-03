from ..component import Component, require

from .model import Base, LookupTable

__all__ = [
    'LookupTableComponent',
    'LookupTable',
]


class LookupTableComponent(Component):
    identity = 'lookup_table'
    metadata = Base.metadata

    @require('resource')
    def setup_pyramid(self, config):
        from . import view  # NOQA
        view.setup_pyramid(self, config)
