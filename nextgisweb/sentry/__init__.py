# -*- coding: utf-8 -*-
from __future__ import division, absolute_import, print_function, unicode_literals

import sentry_sdk
from sentry_sdk.integrations.pyramid import PyramidIntegration
from sentry_sdk.integrations.sqlalchemy import SqlalchemyIntegration

from ..component import Component
from ..lib.config import Option

__all__ = ['SentryComponent', ]


class SentryComponent(Component):
    identity = 'sentry'

    def __init__(self, env, settings):
        super(SentryComponent, self).__init__(env, settings)

        if 'dsn' in self.options:
            # Patch MAX_STRING_LENGTH to prevent clipping of big error messages,
            # especially for mako template tracebacks.
            sentry_sdk.utils.MAX_STRING_LENGTH = 8192

            sentry_sdk.init(
                self.options['dsn'],
                integrations=[
                    PyramidIntegration(),
                    SqlalchemyIntegration(),
                ],
                ignore_errors=[KeyboardInterrupt],
                environment=self.options['environment'],
                shutdown_timeout=self.options['shutdown_timeout'],
            )

    def setup_pyramid(self, config):
        sentry_sdk.set_user(dict(id=self.env.core.instance_id))

    option_annotations = (
        Option('dsn'),
        Option('environment', default=None),
        Option('shutdown_timeout', int, default=30)
    )
