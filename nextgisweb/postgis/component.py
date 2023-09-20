from datetime import timedelta

from nextgisweb.env import Component, require
from nextgisweb.lib.config import Option


class PostgisComponent(Component):
    def initialize(self):
        super().initialize()
        self._engine = dict()

    @require("feature_layer")
    def setup_pyramid(self, config):
        from . import api, view

        api.setup_pyramid(self, config)
        view.setup_pyramid(self, config)

    option_annotations = (
        Option("connect_timeout", timedelta, default=timedelta(seconds=15)),
        Option("statement_timeout", timedelta, default=timedelta(seconds=15)),
    )
