from datetime import timedelta
from functools import cache

import sqlalchemy as sa
from sqlalchemy.exc import SQLAlchemyError

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

        # Workaround for NextGIS Web exception: nextgisweb.i18n.Translatable may
        # be passed as exception arguments, and Sentry won't stringify them.
        def stringify_i18n(event, hint):
            if (e := event.get("exception")) and (e_values := e.get("values")):
                for i in e_values:
                    if (i_value := i.get("value")) and not isinstance(i_value, str):
                        i["value"] = str(i_value)
            return event

        @cache
        def get_instance_id():
            try:
                try:
                    instance_id = DBSession.scalar(qs)
                except SQLAlchemyError:
                    # Transaction may be aborted, so can try a new connection.
                    # Rollback doesn't fit here as it changes the transaction
                    # state.
                    with env.core.engine.connect() as con:
                        instance_id = con.scalar(qs)
            except SQLAlchemyError:
                logger.warning("Unable to fetch instance ID")
            except Exception:
                logger.error("Error retrieving instance ID")
                return None
            else:
                if instance_id is not None:
                    return dict(id=instance_id)
                else:
                    logger.warning("Unable to fetch instance ID")
                    return None

        def add_instance_id(event, hint):
            if event_user := get_instance_id():
                event["user"] = event_user
            return event

        with sentry_sdk.configure_scope() as scope:
            scope.add_event_processor(stringify_i18n)
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
                    f"and will be removed in 5.1.0, use '{keys[0]}' instead."
                )
            return value
