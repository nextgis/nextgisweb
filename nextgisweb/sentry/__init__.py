# -*- coding: utf-8 -*-
from __future__ import division, absolute_import, print_function, unicode_literals

import sentry_sdk
from sentry_sdk.integrations.pyramid import PyramidIntegration

from ..component import Component
from ..lib.config import Option

__all__ = ['SentryComponent', ]


class SentryComponent(Component):
    identity = 'sentry'

    def __init__(self, env, settings):
        super(SentryComponent, self).__init__(env, settings)

        if 'dsn' in self.options:
            sentry_sdk.init(
                self.options['dsn'],
                integrations=[PyramidIntegration()],
            )

    option_annotations = (
        Option('dsn'),
    )
