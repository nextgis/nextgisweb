import json

import sqlalchemy

from ..lib.config import Option
from ..lib.logging import logger
from ..component import Component
from ..core.model import Setting

__all__ = ['SentryComponent', ]


class SentryComponent(Component):
    identity = 'sentry'

    def initialize(self):
        super().initialize()
        self.enabled = 'dsn' in self.options
        if self.enabled:
            self.initialize_sentry_sdk()

    def initialize_sentry_sdk(self):
        import sentry_sdk
        from sentry_sdk.integrations.pyramid import PyramidIntegration
        from sentry_sdk.integrations.sqlalchemy import SqlalchemyIntegration

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

        ts = Setting.__table__
        qs = ts.select().where(sqlalchemy.and_(
            ts.c.component == 'core',
            ts.c.name == 'instance_id'))

        event_user = None

        def add_instance_id(event, hint):
            nonlocal event_user
            if event_user is None:
                try:
                    row = self.env.core.DBSession.connection() \
                        .execute(qs).fetchone()
                except sqlalchemy.exc.ProgrammingError:
                    logger.debug(
                        "Failed to get instance_id, the database may not "
                        "have been initialized yet")
                except Exception:
                    logger.error("Got an exception while getting instance_id")
                else:
                    if row is not None:
                        instance_id = json.loads(row.value)
                        event_user = dict(id=instance_id)
                    else:
                        logger.debug("Missing instance_id")

            if event_user is not None:
                event['user'] = event_user

            return event

        with sentry_sdk.configure_scope() as scope:
            scope.add_event_processor(add_instance_id)

    option_annotations = (
        Option('dsn'),
        Option('environment', default=None),
        Option('shutdown_timeout', int, default=30)
    )
