from datetime import datetime as dt
from datetime import timedelta
from os import environ

import transaction
from babel import Locale
from babel.core import UnknownLocaleError

from nextgisweb.env import Component, _, require
from nextgisweb.lib.config import Option, OptionAnnotations
from nextgisweb.lib.imptool import module_path
from nextgisweb.lib.logging import logger

from . import uacompat
from .model import Session, SessionStore
from .tomb import Configurator, iter_routes
from .util import StaticMap, gensecret


class PyramidComponent(Component):
    def make_app(self, settings={}):
        settings = dict(self._settings, **settings)
        settings["pyramid.static_map"] = StaticMap()
        config = Configurator(settings=settings)

        # Setup pyramid app for other components
        chain = self._env.chain("setup_pyramid", first="pyramid")
        for comp in chain:
            comp.setup_pyramid(config)

        from .api import setup_pyramid_csettings

        setup_pyramid_csettings(self, config)

        config.commit()

        self.route_meta = route_meta = dict()

        for route in iter_routes(config.registry.introspector):
            if not route.client or route.name.startswith("_"):
                continue
            route_meta[route.name] = [route.itemplate, *route.path_params.keys()]

        return config

    def initialize_db(self):
        self.env.core.init_settings(self.identity, "custom_css.ckey", gensecret(8))
        self.env.core.init_settings(self.identity, "company_logo.ckey", gensecret(8))

    @require("resource")
    def setup_pyramid(self, config):
        from . import api, lunkwill, view
        from . import uacompat as uac

        view.setup_pyramid(self, config)
        api.setup_pyramid(self, config)
        uac.setup_pyramid(self, config)

        rt_not_set = self.options["request_timeout"] is None

        try:
            import uwsgi

            if rt_not_set:
                if ev := environ.get("UWSGI_HARAKIRI_ORIGINAL"):
                    # Even if lunkwill is disabled it can override uWSGI option
                    self.options["request_timeout"] = timedelta(seconds=int(ev))
                elif ev := uwsgi.opt.get("harakiri"):
                    self.options["request_timeout"] = timedelta(seconds=int(ev))

            lunkwill_rpc = b"lunkwill" in uwsgi.rpc_list()
        except ImportError:
            uwsgi = None
            lunkwill_rpc = False

        if self.options["lunkwill.enabled"] is None:
            self.options["lunkwill.enabled"] = lunkwill_rpc

        if self.options["lunkwill.enabled"]:
            if self.options["lunkwill.host"] is None:
                self.options["lunkwill.host"] = environ.get("LUNKWILL_HOST", "127.0.0.1")

            if self.options["lunkwill.port"] is None:
                self.options["lunkwill.port"] = int(environ.get("LUNKWILL_PORT", "8042"))

            logger.debug(
                "Lunkwill extension enabled: %s:%d",
                self.options["lunkwill.host"],
                self.options["lunkwill.port"],
            )
            if uwsgi is None:
                raise RuntimeError("Lunkwill requires uWSGI stack loaded")
            if not lunkwill_rpc:
                raise RuntimeError("Lunkwill RPC missing in uWSGI stack")
        else:
            logger.debug("Lunkwill extension disabled")

        lunkwill.setup_pyramid(self, config)

        if rt_not_set and (ev := self.options["request_timeout"]):
            logger.debug("Request timeout %s detected from uWSGI", str(ev))

    def client_settings(self, request):
        result = dict()

        result["support_url"] = self.env.core.support_url_view(request)
        result["help_page_url"] = self.env.pyramid.help_page_url_view(request)
        result["company_logo"] = dict(
            enabled=self.company_logo_enabled(request),
            ckey=self.env.core.settings_get("pyramid", "company_logo.ckey"),
            link=self.company_url_view(request),
        )

        result["languages"] = []
        for locale in self.env.core.locale_available:
            try:
                babel_locale = Locale.parse(locale, sep="-")
            except UnknownLocaleError:
                display_name = locale
            else:
                display_name = babel_locale.get_display_name().title()
            result["languages"].append(dict(display_name=display_name, value=locale))
        result["language_contribute_url"] = self.env.core.options["locale.contribute_url"]

        result["storage_enabled"] = self.env.core.options["storage.enabled"]
        result["storage_limit"] = self.env.core.options["storage.limit"]
        result["lunkwill_enabled"] = self.options["lunkwill.enabled"]
        result["instance_id"] = self.env.core.instance_id

        return result

    def client_codegen(self):
        from . import codegen as m

        m.client_codegen(self)

    @property
    def template_include(self):
        return ("nextgisweb:pyramid/template/update.mako",)

    def maintenance(self):
        super().maintenance()
        self.cleanup()

    def cleanup(self):
        logger.info("Cleaning up sessions...")

        with transaction.manager:
            actual_date = dt.utcnow() - self.options["session.cookie.max_age"]
            deleted_sessions = Session.filter(Session.last_activity < actual_date).delete()

        logger.info("Deleted: %d sessions", deleted_sessions)

    def sys_info(self):
        try:
            import uwsgi

            yield ("uWSGI", uwsgi.version.decode())
        except ImportError:
            pass

        if t := self.options["request_timeout"]:
            yield (_("Request timeout"), t)

        lunkwill = self.options["lunkwill.enabled"]
        yield ("Lunkwill", _("Enabled") if lunkwill else _("Disabled"))

    def backup_configure(self, config):
        super().backup_configure(config)
        config.exclude_table_data("public", Session.__tablename__)
        config.exclude_table_data("public", SessionStore.__tablename__)

    def query_stat(self):
        result = dict()

        try:
            result["cors"] = len(self.env.core.settings_get("pyramid", "cors_allow_origin")) > 0
        except KeyError:
            result["cors"] = False

        try:
            result["custom_css"] = (
                self.env.core.settings_get("pyramid", "custom_css").strip() != ""
            )
        except KeyError:
            result["custom_css"] = False

        return result

    # fmt: off
    option_annotations = OptionAnnotations((
        Option("help_page.enabled", bool, default=True),
        Option("help_page.url", default="https://nextgis.com/redirect/{lang}/help/"),

        Option("logo", default=str(module_path("nextgisweb.pyramid") / "asset/nextgis_logo_s.svg")),
        Option("favicon", default=str(module_path("nextgisweb.pyramid") / "asset/favicon.ico")),
        Option("company_url", default="https://nextgis.com"),
        Option("desktop_gis_example", default="NextGIS QGIS"),
        Option("nextgis_external_docs_links", default=True),

        Option("backup.download", bool, default=False),

        Option("session.cookie.name", str, default="ngw_sid",
               doc="Session cookie name"),
        Option("session.cookie.max_age", timedelta, default=timedelta(days=7),
               doc="Session cookie max_age"),
        Option("session.activity_delta", timedelta, default=timedelta(minutes=10),
               doc="Session last activity update time delta."),

        Option("static_key", default=None),

        Option("request_timeout", timedelta, default=None, doc=(
            "Request timeout reported to a client. For uWSGI deployments it's "
            "autodetected from uWSGI options.")),
        Option("response_buffering", bool, default=None, doc=(
            "Does the reverse proxy server in front of NextGIS Web use "
            "output buffering or not? It's enabled by default in Nginx, "
            "but it's better let NextGIS Web know about it.")),
        Option("x_accel_buffering", bool, default=False, doc=(
            "Allow usage of X-Accel-Buffering header to control output "
            "buffering as it's done in Nginx. See docs on proxy_buffering "
            "directive for ngx_http_proxy module for details.")),

        Option("debugtoolbar.enabled", bool),
        Option("debugtoolbar.hosts"),

        Option("legacy_locale_switcher", bool, default=False),

        Option("lunkwill.enabled", bool, default=None),
        Option("lunkwill.host", str, default=None),
        Option("lunkwill.port", int, default=None),
        Option("lunkwill.secret", str, secure=True, default=None),

        Option("compression.algorithms", list, default=['br', 'gzip']),
    )) + uacompat.option_annotations
    # fmt: on
