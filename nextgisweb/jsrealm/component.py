import re
from subprocess import check_output

from nextgisweb.env import Component
from nextgisweb.lib.config import Option
from nextgisweb.lib.logging import logger


class JSRealmComponent(Component):
    def sys_info(self):
        result = []
        try:
            out = check_output(["node", "--version"], universal_newlines=True).strip()
            node_version = re.match("v?(.*)", out).group(1)
            result.append(("Node", node_version))
        except Exception:
            logger.error("Failed to get node version", exc_info=True)

        return result

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
