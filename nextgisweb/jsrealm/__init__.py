import re
from subprocess import check_output

from ..component import Component
from ..lib.config import Option
from ..lib.logging import logger

from .util import COMP_ID
from . import command  # NOQA


class JSRealmComponent(Component):
    identity = COMP_ID

    def sys_info(self):
        result = []

        try:
            out = check_output(['node', '--version'], universal_newlines=True).strip()
            node_version = re.match('v?(.*)', out).group(1)
            result.append(("Node", node_version))
        except Exception:
            logger.error("Failed to get node version", exc_info=True)

        return result

    def setup_pyramid(self, config):
        from . import view
        view.setup_pyramid(self, config)

    option_annotations = (
        Option('dist_path', default='dist'),
    )
