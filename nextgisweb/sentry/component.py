from datetime import timedelta

import sqlalchemy as sa
from sqlalchemy.exc import DatabaseError

from nextgisweb.env import Component, DBSession, env
from nextgisweb.lib.config import Option
from nextgisweb.lib.logging import logger

from nextgisweb.core.model import Setting


class SentryComponent(Component):
    def __init__(self, env, settings):
        super().__init__(env, settings)
        self.dsn_py = None
        self.dsn_js = None
        self.environment = None

    def initialize(self):
        super().initialize()

        self.dsn_py = _deprecated_options(self.options, "dsn.python", "dsn")
        self.dsn_js = _deprecated_options(self.options, "dsn.javascript", "js.dsn")
        self.environment = self.options["environment"]

        if self.dsn_py:
            self.initialize_sentry_sdk()

    def initialize_sentry_sdk(self):
        import sentry_sdk
        from sentry_sdk.integrations.pyramid import PyramidIntegration
        from sentry_sdk.integrations.sqlalchemy import SqlalchemyIntegration

        # Patch MAX_STRING_LENGTH to prevent clipping of big error messages,
        # especially for mako template tracebacks.
        sentry_sdk.utils.MAX_STRING_LENGTH = 8192

        sentry_sdk.init(
            self.dsn_py,
            environment=self.environment,
            integrations=[PyramidIntegration(), SqlalchemyIntegration()],
            ignore_errors=[KeyboardInterrupt],
            shutdown_timeout=int(self.options["shutdown_timeout"].total_seconds()),
        )

        sc = Setting.__table__.columns
        qs = sa.select(sc.value).where(
            sc.component == "core",
            sc.name == "instance_id",
        )

        event_user = None

        def add_instance_id(event, hint):
            nonlocal event_user

            if event_user is None:
                try:
                    try:
                        instance_id = DBSession.scalar(qs)
                    except DatabaseError:
                        # Transaction may be aborted, so can try a new
                        # connection. Rollback doesn't fit here as it changes
                        # the transaction state.
                        with env.core.engine.connect() as con:
                            instance_id = con.scalar(qs)
                except DatabaseError:
                    logger.warning(
                        "Failed to get instance ID, the database may not have "
                        "been initialized yet"
                    )
                except Exception:
                    logger.error("Got an exception while getting instance ID")
                else:
                    if instance_id is not None:
                        # That's OK to cache, instance ID can't change
                        event_user = dict(id=instance_id)
                    else:
                        logger.warning(
                            "Instance ID is not set, the database may not have "
                            "been initialized yet"
                        )

            if event_user is not None:
                event["user"] = event_user

            return event

        with sentry_sdk.configure_scope() as scope:
            scope.add_event_processor(add_instance_id)

    def setup_pyramid(self, config):
        from . import view  # noqa: F401

    @property
    def template_include(self):
        return ("nextgisweb:sentry/template/init.mako",) if self.dsn_js else ()

    # fmt: off
    option_annotations = (
        Option("dsn.python", default=None, doc="DSN for Python SDK."),
        Option("dsn.javascript", default=None, doc="DSN for browser SDK."),
        Option("environment", default="production", doc="Environment name."),
        Option("shutdown_timeout", timedelta, default=timedelta(seconds=30), doc=(
            "Timeout to send events in case of application shutdown.")),

        Option("dsn", default=None, doc="DEPRECATED alias for dsn.python."),
        Option("js.dsn", default=None, doc="DEPRECATED alias for dsn.javascript.")
    )
    # fmt: on


def _deprecated_options(options, *keys):
    for idx, key in enumerate(keys):
        if value := options[key]:
            if idx != 0:
                logger.warning(
                    f"The '{key}' setting has been deprecated in 4.9.0.dev1 "
                    f"and will be removed in 4.5.0, use '{keys[0]}' instead."
                )
            return value
