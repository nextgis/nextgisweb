from nextgisweb.env import Component
from nextgisweb.lib.config import Option


class JSRealmComponent(Component):
    def setup_pyramid(self, config):
        from . import view

        view.setup_pyramid(self, config)

    # fmt: off
    option_annotations = (
        Option("dist_path", default="dist"),
        Option("tscheck", bool, default=None),
        Option("eslint", bool, default=None),
    )
    # fmt: on
