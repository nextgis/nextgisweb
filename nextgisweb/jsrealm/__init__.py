# -*- coding: utf-8 -*-
from __future__ import division, absolute_import, print_function, unicode_literals

from ..component import Component
from ..lib.config import Option

from .util import COMP_ID
from . import command  # NOQA


class JSRealmComponent(Component):
    identity = COMP_ID

    def setup_pyramid(self, config):
        from . import view
        view.setup_pyramid(self, config)

    option_annotations = (
        Option('dist_path', default='dist'),
    )
