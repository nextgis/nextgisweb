import os
import os.path
from base64 import b64decode
from datetime import datetime, timedelta
from hashlib import md5
from itertools import chain
from pathlib import Path
from time import sleep
from typing import Optional

from markupsafe import Markup
from psutil import Process
from pyramid.events import BeforeRender
from pyramid.httpexceptions import HTTPFound, HTTPNotFound
from pyramid.response import FileResponse, Response
from sqlalchemy import text

from nextgisweb.env import DBSession, env, gettext, inject
from nextgisweb.env.package import pkginfo
from nextgisweb.lib import dynmenu as dm
from nextgisweb.lib.apitype import JSONType, QueryString
from nextgisweb.lib.i18n import trstr_factory
from nextgisweb.lib.imptool import module_path
from nextgisweb.lib.json import dumps
from nextgisweb.lib.logging import logger

from nextgisweb.core import CoreComponent
from nextgisweb.core.exception import ForbiddenError, UserException

from . import exception, permission, renderer
from .component import PyramidComponent
from .openapi import openapi
from .session import WebSession
from .tomb.predicate import ErrorRendererPredicate
from .tomb.response import StaticFileResponse
from .util import StaticMap, StaticSourcePredicate, set_output_buffering, viewargs


def asset(request):
    component = request.matchdict["component"]
    subpath = request.matchdict["subpath"]

    try:
        comp_obj = env.components[component]
    except KeyError:
        raise HTTPNotFound()

    pth = comp_obj.resource_path("/".join(("asset",) + subpath))
    if pth.is_file():
        return FileResponse(pth, request=request, cache_max_age=3600)
    else:
        raise HTTPNotFound()


def static_view(request):
    static_path = request.environ["static_path"]
    cache = request.matchdict["skey"] == request.env.pyramid.static_key[1:]
    return StaticFileResponse(str(static_path), cache=cache, request=request)


@inject()
def asset_favicon(request, *, pyramid: PyramidComponent):
    fn_favicon = pyramid.options["favicon"]
    if os.path.isfile(fn_favicon):
        return FileResponse(fn_favicon, request=request, content_type="image/x-icon")
    else:
        raise HTTPNotFound()


@inject()
def asset_css(request, *, ckey: Optional[str] = None, core: CoreComponent):
    response = Response(
        core.settings_get("pyramid", "custom_css", ""),
        content_type="text/css",
        charset="utf-8",
    )

    if ckey == core.settings_get("pyramid", "custom_css.ckey"):
        response.cache_control.public = True
        response.cache_control.max_age = 86400

    return response


@inject()
def asset_hlogo(request, *, ckey: Optional[str] = None, core: CoreComponent):
    if (data := core.settings_get("pyramid", "logo", None)) is None:
        raise HTTPNotFound()
    mime_type, file = data
    response = Response(b64decode(file), content_type=mime_type)

    if ckey and ckey == core.settings_get("pyramid", "logo.ckey"):
        response.cache_control.public = True
        response.cache_control.max_age = 86400

    return response


@inject()
def asset_blogo(
    request,
    *,
    ckey: Optional[str] = None,
    core: CoreComponent,
    pyramid: PyramidComponent,
):
    if (view := pyramid.company_logo_view) is not None:
        try:
            response = view(request)
        except HTTPNotFound:
            response = None
    else:
        response = None

    if response is None:
        default = pyramid.resource_path("asset/logo_outline.png")
        response = FileResponse(default)

    if ckey and ckey == core.settings_get("pyramid", "company_logo.ckey"):
        response.cache_control.public = True
        response.cache_control.max_age = 86400

    return response


def home(request):
    try:
        home_path = request.env.core.settings_get("pyramid", "home_path")
    except KeyError:
        home_path = None

    if home_path is not None:
        if home_path.lower().startswith(("http://", "https://")):
            url = home_path
        elif home_path.startswith("/"):
            url = request.application_url + home_path
        else:
            url = request.application_url + "/" + home_path
        return HTTPFound(url)
    else:
        return HTTPFound(location=request.route_url("resource.show", id=0))


def openapi_json(request) -> JSONType:
    return openapi(request.registry.introspector)


def openapi_json_test(request) -> JSONType:
    from .test.test_openapi import config

    return openapi(config.registry.introspector, prefix="/")


@viewargs(renderer="react")
def swagger(request):
    return dict(
        title=gettext("HTTP API documentation"),
        entrypoint="@nextgisweb/pyramid/swagger-ui",
        props=dict(url=request.route_url("pyramid.openapi_json")),
    )


@viewargs(renderer="mako")
@inject()
def control_panel(request, *, comp: PyramidComponent):
    if not request.user.is_administrator and len(request.user.effective_permissions) == 0:
        raise ForbiddenError
    return dict(
        title=gettext("Control panel"),
        control_panel=request.env.pyramid.control_panel,
    )


def locale(request):
    @request.add_response_callback
    def callback(request, response):
        response.set_cookie(
            "ngw_slg",
            request.matchdict["locale"],
            **WebSession.cookie_settings(request),
        )

    return HTTPFound(location=request.GET.get("next", request.application_url))


@viewargs(renderer="mako")
def sysinfo(request):
    request.require_administrator()
    return dict(title=gettext("System information"), dynmenu=request.env.pyramid.control_panel)


@viewargs(renderer="react")
def storage(request):
    request.require_administrator()
    return dict(
        entrypoint="@nextgisweb/pyramid/storage-summary",
        title=gettext("Storage"),
        dynmenu=request.env.pyramid.control_panel,
    )


@viewargs(renderer="backup.mako")
def backup_browse(request):
    if not request.env.pyramid.options["backup.download"]:
        raise HTTPNotFound()
    request.require_administrator()
    items = request.env.core.get_backups()
    return dict(title=gettext("Backups"), items=items, dynmenu=request.env.pyramid.control_panel)


def backup_download(request):
    if not request.env.pyramid.options["backup.download"]:
        raise HTTPNotFound()
    request.require_administrator()
    fn = request.env.core.backup_filename(request.matchdict["filename"])
    return FileResponse(fn)


@viewargs(renderer="react")
def cors(request):
    request.user.require_permission(any, *permission.cors)
    return dict(
        title=gettext("Cross-origin resource sharing (CORS)"),
        entrypoint="@nextgisweb/pyramid/cors-settings",
        props=dict(readonly=not request.user.has_permission(permission.cors_manage)),
        dynmenu=request.env.pyramid.control_panel,
    )


@viewargs(renderer="react")
def custom_css(request):
    request.require_administrator()
    return dict(
        entrypoint="@nextgisweb/pyramid/custom-css-form",
        title=gettext("Custom CSS"),
        dynmenu=request.env.pyramid.control_panel,
    )


@viewargs(renderer="react")
def cp_logo(request):
    request.require_administrator()
    return dict(
        entrypoint="@nextgisweb/pyramid/logo-form",
        title=gettext("Custom logo"),
        dynmenu=request.env.pyramid.control_panel,
    )


@viewargs(renderer="react")
def system_name(request):
    request.require_administrator()
    return dict(
        entrypoint="@nextgisweb/pyramid/system-name-form",
        title=gettext("Web GIS name"),
        dynmenu=request.env.pyramid.control_panel,
    )


@viewargs(renderer="react")
def home_path(request):
    request.require_administrator()
    return dict(
        entrypoint="@nextgisweb/pyramid/home-path",
        title=gettext("Home path"),
        dynmenu=request.env.pyramid.control_panel,
    )


@viewargs(renderer="react")
def metrics(request):
    request.require_administrator()
    return dict(
        entrypoint="@nextgisweb/pyramid/metrics",
        title=gettext("Metrics and analytics"),
        dynmenu=request.env.pyramid.control_panel,
    )


def test_request(request):
    comp = request.env.pyramid
    handler = comp.test_request_handler
    if handler:
        return handler(request)
    else:
        raise ValueError("Invalid test request handler")


def test_exception_handled(request):
    class HandledTestException(UserException):
        title = "Title"
        message = "Message"
        detail = "Detail"
        http_status_code = 418

    raise HandledTestException()


def test_exception_unhandled(request):
    class UnhandledTestException(Exception):
        pass

    raise UnhandledTestException()


def test_exception_transaction(request):
    request.user

    try:
        DBSession.execute(text("DO $$ BEGIN RAISE division_by_zero; END $$"))
    except Exception:
        pass

    DBSession.execute(text("SELECT 1"))


@viewargs(renderer="mako")
def test_exception_template(request):
    return dict()


def test_timeout(request):
    duration = float(request.GET.get("t", "60"))
    interval = float(request.GET["i"]) if "i" in request.GET else None
    buffering = (request.GET["b"].lower() in ("true", "1", "yes")) if "b" in request.GET else None

    start = datetime.utcnow()
    finish = start + timedelta(seconds=duration)

    def generator():
        idx = 0
        while True:
            time_to_sleep = (finish - datetime.utcnow()).total_seconds()
            if interval is not None:
                time_to_sleep = min(time_to_sleep, interval)
            if time_to_sleep < 0:
                break
            sleep(time_to_sleep)
            idx += 1
            current = datetime.utcnow()
            elapsed = (current - start).total_seconds()
            line = "idx = {}, elapsed = {:.3f}, timestamp = {}".format(
                idx, elapsed, current.isoformat()
            )

            logger.warning("Timeout test: " + line)
            yield (line + "\n").encode("utf-8")

    resp = Response(app_iter=generator(), content_type="text/plain")
    set_output_buffering(request, resp, buffering, strict=True)
    return resp


def setup_pyramid(comp, config):
    env = comp.env
    is_debug = env.core.debug

    # Session factory
    config.set_session_factory(WebSession)

    _setup_static(comp, config)
    _setup_pyramid_debugtoolbar(comp, config)
    _setup_pyramid_tm(comp, config)
    _setup_pyramid_mako(comp, config)

    # COMMON REQUEST'S ATTRIBUTES

    qs_parser = lambda req: QueryString(req.environ["QUERY_STRING"])
    is_api = lambda req: req.path_info.lower().startswith("/api/")

    config.add_request_method(qs_parser, "qs_parser", property=True)
    config.add_request_method(lambda req: env, "env", property=True)
    config.add_request_method(is_api, "is_api", property=True)

    # ERROR HANGLING

    comp.error_handlers = list()

    @comp.error_handlers.append
    def error_renderer_handler(request, err_info, exc, exc_info):
        error_renderer = None

        mroute = request.matched_route
        if mroute is not None:
            for predicate in mroute.predicates:
                if isinstance(predicate, ErrorRendererPredicate):
                    error_renderer = predicate.val
                    break

        if error_renderer is not None:
            return error_renderer(request, err_info, exc, exc_info, debug=is_debug)

    @comp.error_handlers.append
    def api_error_handler(request, err_info, exc, exc_info):
        if request.is_api or request.is_xhr:
            return exception.json_error_response(request, err_info, exc, exc_info, debug=is_debug)

    @comp.error_handlers.append
    def html_error_handler(request, err_info, exc, exc_info):
        return exception.html_error_response(request, err_info, exc, exc_info, debug=is_debug)

    def error_handler(request, err_info, exc, exc_info, **kwargs):
        for handler in comp.error_handlers:
            result = handler(request, err_info, exc, exc_info)
            if result is not None:
                return result

    config.registry.settings["error.err_response"] = error_handler
    config.registry.settings["error.exc_response"] = error_handler
    config.include(exception)

    # INTERNATIONALIZATION

    # Substitute localizer from pyramid with our own, original is
    # too tied to translationstring, that works strangely with string
    # interpolation via % operator.
    def localizer(request, localizer=comp.env.core.localizer):
        return localizer(request.locale_name)

    def translate(request):
        return request.localizer.translate

    config.add_request_method(localizer, "localizer", property=True)
    config.add_request_method(translate, "translate", property=True)

    lg_default = comp.env.core.locale_default
    lg_ordered = sorted(
        comp.env.core.locale_available,
        key=lambda lg: (int(lg != lg_default), lg),
    )

    @config.set_locale_negotiator
    def locale_negotiator(request):
        # The previous implementation used user and session attributes, but it
        # caused too much ploblems as the locale negotiator could be invoked
        # from an error handler to localize an error message.

        for ck in ("ngw_slg", "ngw_ulg"):
            if (lg := request.cookies.get(ck)) in lg_ordered:
                return lg

        return request.accept_language.lookup(
            lg_ordered,
            default=lg_ordered[0],
        )

    # Base template includes

    comp._template_include = list(
        chain(*[c.template_include for c in comp.env.chain("template_include")])
    )

    # RENDERERS

    config.add_renderer("json", renderer.JSON())
    config.add_renderer("msgspec", renderer.MsgSpec())

    # Filter for quick translation. Defines function tr, which we can use
    # instead of request.localizer.translate in mako templates.
    def tr_subscriber(event):
        def _tr(msg):
            return event["request"].localizer.translate(msg)

        event["tr"] = _tr

    config.add_subscriber(tr_subscriber, BeforeRender)

    # OTHERS

    config.add_route("pyramid.asset.favicon", "/favicon.ico", get=asset_favicon)
    config.add_route("pyramid.asset.css", "/pyramid/css", get=asset_css)
    config.add_route("pyramid.asset.hlogo", "/pyramid/mlogo", get=asset_hlogo)
    config.add_route("pyramid.asset.blogo", "/pyramid/blogo", get=asset_blogo)

    config.add_route("home", "/", client=False).add_view(home)

    config.add_route("pyramid.openapi_json", "/openapi.json", get=openapi_json)

    config.add_route("pyramid.openapi_json_test", "/test/openapi.json", get=openapi_json_test)

    config.add_route("pyramid.swagger", "/doc/api", get=swagger)

    config.add_route(
        "pyramid.control_panel",
        "/control-panel",
    ).add_view(control_panel)

    config.add_route(
        "pyramid.control_panel.sysinfo",
        "/control-panel/sysinfo",
    ).add_view(sysinfo)

    if env.core.options["storage.enabled"]:
        config.add_route("pyramid.control_panel.storage", "/control-panel/storage").add_view(
            storage
        )

    config.add_route("pyramid.control_panel.backup.browse", "/control-panel/backup/").add_view(
        backup_browse
    )

    config.add_route(
        "pyramid.control_panel.backup.download", "/control-panel/backup/{filename:str}"
    ).add_view(backup_download)

    config.add_route(
        "pyramid.control_panel.cors",
        "/control-panel/cors",
    ).add_view(cors)

    config.add_route("pyramid.control_panel.custom_css", "/control-panel/custom-css").add_view(
        custom_css
    )

    config.add_route("pyramid.control_panel.logo", "/control-panel/logo").add_view(cp_logo)

    config.add_route("pyramid.control_panel.system_name", "/control-panel/system-name").add_view(
        system_name
    )

    config.add_route("pyramid.control_panel.home_path", "/control-panel/home-path").add_view(
        home_path
    )

    config.add_route(
        "pyramid.control_panel.metrics",
        "/control-panel/metrics",
    ).add_view(metrics)

    config.add_route("pyramid.locale", "/locale/{locale:str}").add_view(locale)

    comp.test_request_handler = None
    config.add_route("pyramid.test_request", "/test/request/").add_view(test_request)

    config.add_route(
        "pyramid.test_exception_handled",
        "/test/exception/handled",
        get=test_exception_handled,
    )

    config.add_route(
        "pyramid.test_exception_unhandled",
        "/test/exception/unhandled",
        get=test_exception_unhandled,
    )

    config.add_route(
        "pyramid.test_exception_transaction",
        "/test/exception/transaction",
        get=test_exception_transaction,
    )

    config.add_route(
        "pyramid.test_exception_template",
        "/test/exception/template",
        get=test_exception_template,
    )

    config.add_route("pyramid.test_timeout", "/test/timeout").add_view(test_timeout)

    comp.control_panel = dm.DynMenu(
        dm.Label("info", gettext("Info")),
        dm.Label("settings", gettext("Settings")),
    )

    @comp.control_panel.add
    def _control_panel(kwargs):
        user = kwargs.request.user

        if user.has_permission(any, *permission.cors):
            yield dm.Link(
                "settings/cors",
                gettext("Cross-origin resource sharing (CORS)"),
                lambda args: (args.request.route_url("pyramid.control_panel.cors")),
            )

        if not user.is_administrator:
            return

        yield dm.Link(
            "info/sysinfo",
            gettext("System information"),
            lambda args: (args.request.route_url("pyramid.control_panel.sysinfo")),
        )

        yield dm.Link(
            "settings/core",
            gettext("Web GIS name"),
            lambda args: (args.request.route_url("pyramid.control_panel.system_name")),
        )

        yield dm.Link(
            "settings/custom_css",
            gettext("Custom CSS"),
            lambda args: (args.request.route_url("pyramid.control_panel.custom_css")),
        )

        yield dm.Link(
            "settings/logo",
            gettext("Custom logo"),
            lambda args: (args.request.route_url("pyramid.control_panel.logo")),
        )

        yield dm.Link(
            "settings/home_path",
            gettext("Home path"),
            lambda args: (args.request.route_url("pyramid.control_panel.home_path")),
        )

        yield dm.Link(
            "settings/metrics",
            gettext("Metrics and analytics"),
            lambda args: (args.request.route_url("pyramid.control_panel.metrics")),
        )

        if env.core.options["storage.enabled"]:
            yield dm.Link(
                "info/storage",
                gettext("Storage"),
                lambda args: (args.request.route_url("pyramid.control_panel.storage")),
            )

        if comp.options["backup.download"]:
            yield dm.Link(
                "info/backups",
                gettext("Backups"),
                lambda args: args.request.route_url("pyramid.control_panel.backup.browse"),
            )


def _setup_static(comp, config):
    config.registry.settings["pyramid.static_map"] = StaticMap()
    config.add_route_predicate("static_source", StaticSourcePredicate)

    if "static_key" in comp.options:
        comp.static_key = "/" + comp.options["static_key"]
        logger.debug("Using static key from options '%s'", comp.static_key[1:])
    elif comp.env.core.debug:
        # In debug build static_key from proccess startup time
        rproc = Process(os.getpid())

        # When running under control of uWSGI master process use master's startup time
        if rproc.name() == "uwsgi":
            rproc_parent = rproc.parent()
            if rproc_parent and rproc_parent.name() == "uwsgi":
                rproc = rproc_parent
            logger.debug("Found uWSGI master process PID=%d", rproc.pid)

        # Use 4-byte hex representation of 1/5 second intervals
        comp.static_key = "/" + hex(int(rproc.create_time() * 5) % (2**64)).replace(
            "0x", ""
        ).replace("L", "")
        logger.debug("Using startup time static key [%s]", comp.static_key[1:])
    else:
        # In production mode build static_key from nextgisweb_* package versions
        package_hash = md5(
            "\n".join(
                (
                    "{}=={}+{}".format(pobj.name, pobj.version, pobj.commit)
                    for pobj in comp.env.packages.values()
                )
            ).encode("utf-8")
        )
        comp.static_key = "/" + package_hash.hexdigest()[:8]
        logger.debug("Using package based static key '%s'", comp.static_key[1:])

    config.add_route(
        "pyramid.static",
        "/static/{skey:str}/*subpath",
        static_source=True,
    ).add_view(static_view)

    def static_url(request, path=""):
        return request.route_url("pyramid.static", subpath=path, skey=comp.static_key[1:])

    config.add_request_method(static_url, property=False)

    def add_static_path(self, suffix, path):
        self.registry.settings["pyramid.static_map"].add(suffix, path)
        logger.debug("Static map: %s > %s", suffix, path.resolve().relative_to(Path().resolve()))

    config.add_directive("add_static_path", add_static_path)

    for cid, c in comp.env.components.items():
        asset_path = c.resource_path("asset")
        if asset_path.is_dir():
            config.add_static_path(f"asset/{cid}", asset_path)


def _setup_pyramid_debugtoolbar(comp, config):
    dt_opt = comp.options.with_prefix("debugtoolbar")
    if not dt_opt.get("enabled", comp.env.core.debug):
        return

    try:
        import pyramid_debugtoolbar
    except ModuleNotFoundError:
        if dt_opt.get("enabled", None) is True:
            raise
        logger.warning("Unable to load pyramid_debugtoolbar")
        return

    settings = config.registry.settings
    if hosts := dt_opt.get("hosts", "0.0.0.0/0" if comp.env.core.debug else None):
        settings["debugtoolbar.hosts"] = hosts
    settings["debugtoolbar.exclude_prefixes"] = ["/static/", "/favicon.ico"]
    settings["debugtoolbar.show_on_exc_only"] = True
    settings["debugtoolbar.max_visible_requests"] = 25
    config.include(pyramid_debugtoolbar)

    config.add_static_path(
        "pyramid_debugtoolbar:static",
        module_path("pyramid_debugtoolbar") / "static",
    )


def _setup_pyramid_tm(comp, config):
    import pyramid_tm

    settings = config.registry.settings

    skip_tm_path_info = (
        "/static/",
        "/favicon.ico",
        "/api/component/pyramid/route",
        "/_debug_toolbar/",
    )

    def activate_hook(request):
        return not request.path_info.startswith(skip_tm_path_info)

    settings["tm.activate_hook"] = activate_hook
    settings["tm.annotate_user"] = False

    config.include(pyramid_tm)


def json_js(value, pretty=False):
    """Mako template function for easy JSON generation

    It can be used as a function ``${json_js(value)}`` or as a filter but in
    conjunction with n-filter ``${value | n, json_js}``."""

    return Markup(dumps(value, pretty=pretty))


def _m_gettext(_template_filename):
    head = _template_filename
    comp_id = None
    while head:
        head, __, part = head.rpartition("/")
        if part == "template":
            comp_id = head.rpartition("/")[-1]
            break

    if comp_id:
        if comp_id.startswith("nextgisweb_"):
            comp_id = comp_id[len("nextgisweb_") :]

        assert comp_id in pkginfo.components, f"Component {comp_id} not found"
        return trstr_factory(comp_id)


def _setup_pyramid_mako(comp, config):
    settings = config.registry.settings

    settings["pyramid.reload_templates"] = comp.env.core.debug
    settings["mako.imports"] = [
        "from markupsafe import Markup",
        "from nextgisweb.pyramid.view import json_js",
        "from nextgisweb.pyramid.view import _m_gettext",
        "_ = _m_gettext(_template_filename); del _m_gettext",
    ]
    settings["mako.default_filters"] = ["h"]

    import pyramid_mako

    config.include(pyramid_mako)

    # Work around the template lookup bug (test_not_found_unauthorized)
    tsp = "template/error.mako"
    base = Path(__file__).parent
    config.override_asset(to_override=f"nextgisweb:pyramid/{tsp}", override_with=str(base / tsp))
