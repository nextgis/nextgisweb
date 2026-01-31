from datetime import timedelta
from os import getenv
from typing import Any

import transaction

from nextgisweb.env import Component, gettext, require
from nextgisweb.lib.config import Option, OptionAnnotations
from nextgisweb.lib.datetime import utcnow_naive
from nextgisweb.lib.imptool import module_path
from nextgisweb.lib.logging import logger

from . import uacompat
from .model import Session, SessionStore
from .tomb import Configurator, iter_routes
from .util import StaticMap, gensecret


class PyramidComponent(Component):
    def __init__(self, env, settings):
        self.client_types: list[Any] = list()
        super().__init__(env, settings)

    def make_app(self, settings={}):
        settings = dict(self._settings, **settings)
        settings["pyramid.started"] = utcnow_naive().timestamp()
        settings["pyramid.static_map"] = StaticMap()
        config = Configurator(settings=settings)

        # Setup pyramid app for other components
        chain = self._env.chain("setup_pyramid", first="pyramid")
        for comp in chain:
            comp.setup_pyramid(config)

        from . import api

        api.setup_pyramid_client_settings(self, config)
        api.setup_pyramid_csettings(self, config)

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
                if ev := getenv("UWSGI_HARAKIRI_ORIGINAL"):
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
            if self.options["lunkwill.proxy"]:
                for optk, optt, optd in (("host", str, "127.0.0.1"), ("port", int, 8042)):
                    optn = f"lunkwill.{optk}"
                    if self.options[optn] is not None:
                        continue
                    opte = f"LUNKWILL_{optk.upper()}"
                    if optv := getenv(opte):
                        logger.debug("Using %s = %s (from %s)", optn, optv, opte)
                        self.options[optn] = optt(optv)
                    else:
                        logger.debug("Using %s = %s (default)", optn, str(optd))
                        self.options[optn] = optd
                logger.debug(
                    "Lunkwill extension proxy to %s:%d",
                    self.options["lunkwill.host"],
                    self.options["lunkwill.port"],
                )
                if self.options["lunkwill.hmux"]:
                    raise NotImplementedError("Lunkwill hmux requires external interception mode")

            else:
                logger.debug("Lunkwill extension with external interception")

            if uwsgi is None:
                raise RuntimeError("Lunkwill requires uWSGI stack loaded")

            if not lunkwill_rpc:
                raise RuntimeError("Lunkwill RPC missing in uWSGI stack")

        else:
            logger.debug("Lunkwill extension disabled")

        lunkwill.setup_pyramid(self, config)

        if rt_not_set and (ev := self.options["request_timeout"]):
            logger.debug("Request timeout %s detected from uWSGI", str(ev))

    def client_codegen(self):
        from . import codegen as m

        nodepkg = self.root_path / "nodepkg"
        config = self.make_app(settings=dict())
        (nodepkg / "api/type.inc.d.ts").write_text(m.api_type(self, config))
        (nodepkg / "api/route.inc.ts").write_text(m.route(self, config))
        (nodepkg / "layout/dynmenu/type.inc.d.ts").write_text(m.dynmenu(self, config))

    def client_type(self, tdef: Any):
        self.client_types.append(tdef)

    @property
    def template_include(self):
        return ("nextgisweb:pyramid/template/update.mako",)

    def maintenance(self):
        super().maintenance()
        self.cleanup()

    def cleanup(self):
        logger.info("Cleaning up sessions...")

        with transaction.manager:
            actual_date = utcnow_naive() - self.options["session.cookie.max_age"]
            deleted_sessions = Session.filter(Session.last_activity < actual_date).delete()

        logger.info("Deleted: %d sessions", deleted_sessions)

    def sys_info(self):
        try:
            import uwsgi

            yield ("uWSGI", uwsgi.version.decode())
        except ImportError:
            pass

        if t := self.options["request_timeout"]:
            yield (gettext("Request timeout"), str(t))

        lunkwill = self.options["lunkwill.enabled"]
        yield ("Lunkwill", gettext("Enabled") if lunkwill else gettext("Disabled"))

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
        Option("company_url", default="https://nextgis.com/redirect/{lang}/"),
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

        Option("legacy_locale_switcher", bool, default=False),

        Option("lunkwill.enabled", bool, default=None),
        Option("lunkwill.proxy", bool, default=True),
        Option("lunkwill.hmux", bool, default=False),
        Option("lunkwill.host", str, default=None),
        Option("lunkwill.port", int, default=None),

        Option("compression.algorithms", list, default=['br', 'gzip']),
    )) + uacompat.option_annotations
    # fmt: on
