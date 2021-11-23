from datetime import timedelta

from ..component import Component, require
from ..lib.config import Option

from .model import Base, PostgisConnection, PostgisLayer

__all__ = ['PostgisConnection', 'PostgisLayer']


class PostgisComponent(Component):
    identity = 'postgis'
    metadata = Base.metadata

    def initialize(self):
        super().initialize()
        self._engine = dict()

    @require('feature_layer')
    def setup_pyramid(self, config):
        from . import view # NOQA
        from . import api
        api.setup_pyramid(self, config)

    option_annotations = (
        Option('statement_timeout', timedelta, default=timedelta(seconds=15)),
    )
