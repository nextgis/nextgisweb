# -*- coding: utf-8 -*-
from __future__ import division, absolute_import, print_function, unicode_literals

import re
from subprocess import check_output

from ..component import Component
from ..lib.config import Option

from .util import COMP_ID
from . import command  # NOQA


class JSRealmComponent(Component):
    identity = COMP_ID

    def sys_info(self):
        out = check_output(['node', '--version'], universal_newlines=True).strip()
        node_version = re.match('v?(.*)', out).group(1)
        return (
            ("Node", node_version),
        )

    def setup_pyramid(self, config):
        from . import view
        view.setup_pyramid(self, config)

    option_annotations = (
        Option('dist_path', default='dist'),
    )
