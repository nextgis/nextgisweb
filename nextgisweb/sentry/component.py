import sqlalchemy as sa
from sqlalchemy.exc import DatabaseError

from nextgisweb.env import Component, DBSession, env
from nextgisweb.lib.config import Option
from nextgisweb.lib.logging import logger

from nextgisweb.core.model import Setting


class SentryComponent(Component):
    def initialize(self):
        super().initialize()
        self.enabled = "dsn" in self.options
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
            self.options["dsn"],
            integrations=[
                PyramidIntegration(),
                SqlalchemyIntegration(),
            ],
            ignore_errors=[KeyboardInterrupt],
            environment=self.options["environment"],
            shutdown_timeout=self.options["shutdown_timeout"],
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

    @property
    def template_include(self):
        return ("nextgisweb:sentry/template/init.mako",)

    # fmt: off
    option_annotations = (
        Option("dsn"),
        Option("environment", default=None),
        Option("shutdown_timeout", int, default=30),

        Option("js.dsn", default=None),
    )
    # fmt: on
