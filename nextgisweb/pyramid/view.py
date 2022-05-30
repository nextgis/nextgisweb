import os
import os.path
from functools import lru_cache
from time import sleep
from datetime import datetime, timedelta
from pkg_resources import resource_filename
from hashlib import md5
from pathlib import Path
from itertools import chain

from psutil import Process
from pyramid.response import Response, FileResponse
from pyramid.events import BeforeRender
from pyramid.httpexceptions import HTTPFound, HTTPNotFound
from sqlalchemy import text
from markupsafe import Markup

from ..gui import REACT_RENDERER
from ..lib.logging import logger
from ..lib.json import dumps
from ..env import env
from .. import dynmenu as dm
from ..core.exception import UserException
from ..package import amd_packages
from ..models import DBSession

from . import exception, renderer
from .session import WebSession
from .util import _, ErrorRendererPredicate, StaticFileResponse, set_output_buffering


def static_amd_file(request):
    subpath = request.matchdict['subpath']
    if len(subpath) == 0:
        raise HTTPNotFound()

    amd_package_name = subpath[0]
    amd_package_path = '/'.join(subpath[1:])

    ap_base_path = _amd_package_path(amd_package_name)
    if ap_base_path is None:
        raise HTTPNotFound()

    filename = os.path.join(ap_base_path, amd_package_path)
    return StaticFileResponse(filename, request=request)


@lru_cache(maxsize=64)
def _amd_package_path(name):
    for p, asset in amd_packages():
        if p == name:
            if asset.find(':') == -1:
                return os.path.join(env.jsrealm.options['dist_path'], asset)
            else:
                py_package, path = asset.split(':', 1)
                return resource_filename(py_package, path)


def home(request):
    try:
        home_path = request.env.core.settings_get('pyramid', 'home_path')
    except KeyError:
        home_path = None

    if home_path is not None:
        if home_path.lower().startswith(('http://', 'https://')):
            url = home_path
        elif home_path.startswith('/'):
            url = request.application_url + home_path
        else:
            url = request.application_url + '/' + home_path
        return HTTPFound(url)
    else:
        return HTTPFound(location=request.route_url('resource.show', id=0))


def control_panel(request):
    request.require_administrator()

    return dict(
        title=_("Control panel"),
        control_panel=request.env.pyramid.control_panel)


def favicon(request):
    fn_favicon = request.env.pyramid.options['favicon']
    if os.path.isfile(fn_favicon):
        return FileResponse(
            fn_favicon, request=request,
            content_type='image/x-icon')
    else:
        raise HTTPNotFound()


def locale(request):
    request.session['pyramid.locale'] = request.matchdict['locale']
    return HTTPFound(location=request.GET.get('next', request.application_url))


def sysinfo(request):
    request.require_administrator()
    return dict(
        title=_("System information"),
        dynmenu=request.env.pyramid.control_panel)


def pkginfo(request):
    return HTTPFound(location=request.route_url(
        'pyramid.control_panel.sysinfo'))


def storage(request):
    request.require_administrator()
    return dict(
        entrypoint='@nextgisweb/pyramid/storage-summary',
        title=_("Storage"),
        dynmenu=request.env.pyramid.control_panel)


def backup_browse(request):
    if not request.env.pyramid.options['backup.download']:
        raise HTTPNotFound()
    request.require_administrator()
    items = request.env.core.get_backups()
    return dict(
        title=_("Backups"), items=items,
        dynmenu=request.env.pyramid.control_panel)


def backup_download(request):
    if not request.env.pyramid.options['backup.download']:
        raise HTTPNotFound()
    request.require_administrator()
    fn = request.env.core.backup_filename(request.matchdict['filename'])
    return FileResponse(fn)


def cors(request):
    request.require_administrator()
    return dict(
        entrypoint='@nextgisweb/pyramid/cors-settings',
        title=_("Cross-origin resource sharing (CORS)"),
        dynmenu=request.env.pyramid.control_panel)


def custom_css(request):
    request.require_administrator()
    return dict(
        entrypoint='@nextgisweb/pyramid/custom-css-form',
        title=_("Custom CSS"),
        dynmenu=request.env.pyramid.control_panel)


def cp_logo(request):
    request.require_administrator()
    return dict(
        entrypoint='@nextgisweb/pyramid/logo-form',
        title=_("Custom logo"),
        dynmenu=request.env.pyramid.control_panel)


def system_name(request):
    request.require_administrator()
    return dict(
        entrypoint='@nextgisweb/pyramid/system-name-form',
        title=_("Web GIS name"),
        dynmenu=request.env.pyramid.control_panel)


def home_path(request):
    request.require_administrator()
    return dict(
        entrypoint='@nextgisweb/pyramid/home-path',
        title=_("Home path"),
        dynmenu=request.env.pyramid.control_panel)


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


def test_timeout(reqest):
    duration = float(reqest.GET.get('t', '60'))
    interval = float(reqest.GET['i']) if 'i' in reqest.GET else None
    buffering = (reqest.GET['b'].lower() in ('true', '1', 'yes')) \
        if 'b' in reqest.GET else None

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
                idx, elapsed, current.isoformat())

            logger.warn("Timeout test: " + line)
            yield (line + "\n").encode('utf-8')

    resp = Response(app_iter=generator(), content_type='text/plain')
    set_output_buffering(reqest, resp, buffering, strict=True)
    return resp


def setup_pyramid(comp, config):
    env = comp.env
    is_debug = env.core.debug

    # Session factory
    config.set_session_factory(WebSession)

    _setup_pyramid_debugtoolbar(comp, config)
    _setup_pyramid_tm(comp, config)
    _setup_pyramid_mako(comp, config)

    # COMMON REQUEST'S ATTRIBUTES

    config.add_request_method(lambda req: env, 'env', property=True)
    config.add_request_method(
        lambda req: req.path_info.lower().startswith('/api/'),
        'is_api', property=True)

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
            return exception.json_error_response(
                request, err_info, exc, exc_info, debug=is_debug)

    @comp.error_handlers.append
    def html_error_handler(request, err_info, exc, exc_info):
        return exception.html_error_response(
            request, err_info, exc, exc_info, debug=is_debug)

    def error_handler(request, err_info, exc, exc_info, **kwargs):
        for handler in comp.error_handlers:
            result = handler(request, err_info, exc, exc_info)
            if result is not None:
                return result

    config.registry.settings['error.err_response'] = error_handler
    config.registry.settings['error.exc_response'] = error_handler
    config.include(exception)

    # INTERNATIONALIZATION

    # Substitute localizer from pyramid with our own, original is
    # too tied to translationstring, that works strangely with string
    # interpolation via % operator.
    def localizer(request):
        return request.env.core.localizer(request.locale_name)
    config.add_request_method(localizer, 'localizer', property=True)

    locale_default = comp.env.core.locale_default
    locale_sorted = [locale_default] + [
        lc for lc in comp.env.core.locale_available
        if lc != locale_default]

    # Replace default locale negotiator with session-based one
    def locale_negotiator(request):
        environ = request.environ

        if 'auth.user' in environ:
            user_loaded = True
        else:
            # Force to load user's profile. But it might fail because of
            # authentication or transaction failueres.
            try:
                request.user
            except Exception:
                user_loaded = False
            else:
                user_loaded = True

        if user_loaded:
            environ_language = environ['auth.user']['language']
            if environ_language is not None:
                return environ_language

        session_language = request.session.get('pyramid.locale')
        if session_language is not None:
            return session_language

        return request.accept_language.lookup(locale_sorted, default=locale_default)

    config.set_locale_negotiator(locale_negotiator)

    # STATIC FILES

    if 'static_key' in comp.options:
        comp.static_key = '/' + comp.options['static_key']
        logger.debug("Using static key from options '%s'", comp.static_key[1:])
    elif is_debug:
        # In debug build static_key from proccess startup time
        rproc = Process(os.getpid())

        # When running under control of uWSGI master process use master's startup time
        if rproc.name() == 'uwsgi' and rproc.parent().name() == 'uwsgi':
            rproc = rproc.parent()
            logger.debug("Found uWSGI master process PID=%d", rproc.pid)

        # Use 4-byte hex representation of 1/5 second intervals
        comp.static_key = '/' + hex(int(rproc.create_time() * 5) % (2 ** 64)) \
            .replace('0x', '').replace('L', '')
        logger.debug("Using startup time static key [%s]", comp.static_key[1:])
    else:
        # In production mode build static_key from nextgisweb_* package versions
        package_hash = md5('\n'.join((
            '{}=={}+{}'.format(pobj.name, pobj.version, pobj.commit)
            for pobj in comp.env.packages.values()
        )).encode('utf-8'))
        comp.static_key = '/' + package_hash.hexdigest()[:8]
        logger.debug("Using package based static key '%s'", comp.static_key[1:])

    config.add_static_view(
        '/static{}/asset'.format(comp.static_key),
        'nextgisweb:static', cache_max_age=3600)

    config.add_route('amd_package', '/static{}/amd/*subpath'.format(comp.static_key)) \
        .add_view(static_amd_file)

    # Base template includes

    comp._template_include = list(chain(*[
        c.template_include for c in comp.env.chain('template_include')]))

    # RENDERERS

    config.add_renderer('json', renderer.JSON())

    # Filter for quick translation. Defines function tr, which we can use
    # instead of request.localizer.translate in mako templates.
    def tr_subscriber(event):
        event['tr'] = event['request'].localizer.translate
    config.add_subscriber(tr_subscriber, BeforeRender)

    # OTHERS

    config.add_route('home', '/').add_view(home)

    def ctpl(n):
        return 'nextgisweb:pyramid/template/%s.mako' % n

    config.add_route('pyramid.control_panel', '/control-panel', client=()) \
        .add_view(control_panel, renderer=ctpl('control_panel'))

    config.add_route('pyramid.favicon', '/favicon.ico').add_view(favicon)

    config.add_route(
        'pyramid.control_panel.sysinfo',
        '/control-panel/sysinfo', client=(),
    ).add_view(sysinfo, renderer=ctpl('sysinfo'))

    config.add_route(
        'pyramid.control_panel.pkginfo',
        '/control-panel/pkginfo'
    ).add_view(pkginfo)

    if env.core.options['storage.enabled']:
        config.add_route(
            'pyramid.control_panel.storage',
            '/control-panel/storage'
        ).add_view(storage, renderer=REACT_RENDERER)

    config.add_route(
        'pyramid.control_panel.backup.browse',
        '/control-panel/backup/'
    ).add_view(backup_browse, renderer=ctpl('backup'))

    config.add_route(
        'pyramid.control_panel.backup.download',
        '/control-panel/backup/{filename}'
    ).add_view(backup_download)

    config.add_route(
        'pyramid.control_panel.cors',
        '/control-panel/cors', client=(),
    ).add_view(cors, renderer=REACT_RENDERER)

    config.add_route(
        'pyramid.control_panel.custom_css',
        '/control-panel/custom-css'
    ).add_view(custom_css, renderer=REACT_RENDERER)

    config.add_route(
        'pyramid.control_panel.logo',
        '/control-panel/logo'
    ).add_view(cp_logo, renderer=REACT_RENDERER)

    config.add_route(
        'pyramid.control_panel.system_name',
        '/control-panel/system-name'
    ).add_view(
        system_name,
        renderer=REACT_RENDERER)

    config.add_route(
        'pyramid.control_panel.home_path',
        '/control-panel/home-path'
    ).add_view(home_path, renderer=REACT_RENDERER)

    config.add_route('pyramid.locale', '/locale/{locale}').add_view(locale)

    comp.test_request_handler = None
    config.add_route('pyramid.test_request', '/test/request/') \
        .add_view(test_request)

    config.add_route('pyramid.test_exception_handled', '/test/exception/handled') \
        .add_view(test_exception_handled)
    config.add_route('pyramid.test_exception_unhandled', '/test/exception/unhandled') \
        .add_view(test_exception_unhandled)
    config.add_route('pyramid.test_exception_transaction', '/test/exception/transaction') \
        .add_view(test_exception_transaction)
    config.add_route('pyramid.test_timeout', '/test/timeout') \
        .add_view(test_timeout)

    config.add_route('pyramid.test_example', '/test/pyramid/example') \
        .add_view(lambda request: {}, renderer="nextgisweb:pyramid/template/example.mako")

    comp.control_panel = dm.DynMenu(
        dm.Label('info', _("Info")),
        dm.Link('info/sysinfo', _("System information"), lambda args: (
            args.request.route_url('pyramid.control_panel.sysinfo'))),

        dm.Label('settings', _("Settings")),
        dm.Link('settings/core', _("Web GIS name"), lambda args: (
            args.request.route_url('pyramid.control_panel.system_name'))),
        dm.Link('settings/cors', _("Cross-origin resource sharing (CORS)"), lambda args: (
            args.request.route_url('pyramid.control_panel.cors'))),
        dm.Link('settings/custom_css', _("Custom CSS"), lambda args: (
            args.request.route_url('pyramid.control_panel.custom_css'))),
        dm.Link('settings/logo', _("Custom logo"), lambda args: (
            args.request.route_url('pyramid.control_panel.logo'))),
        dm.Link('settings/home_path', _("Home path"), lambda args: (
            args.request.route_url('pyramid.control_panel.home_path'))),
    )

    if env.core.options['storage.enabled']:
        comp.control_panel.add(dm.Link('info/storage', _("Storage"), lambda args: (
            args.request.route_url('pyramid.control_panel.storage'))))

    if comp.options['backup.download']:
        comp.control_panel.add(dm.Link(
            'info/backups', _("Backups"), lambda args:
            args.request.route_url('pyramid.control_panel.backup.browse')))


def _setup_pyramid_debugtoolbar(comp, config):
    dt_opt = comp.options.with_prefix('debugtoolbar')
    if not dt_opt.get('enabled', comp.env.core.debug):
        return

    settings = config.registry.settings
    settings['debugtoolbar.hosts'] = dt_opt.get(
        'hosts', '0.0.0.0/0' if comp.env.core.debug else None)
    settings['debugtoolbar.exclude_prefixes'] = ['/static/', ]

    import pyramid_debugtoolbar
    config.include(pyramid_debugtoolbar)


def _setup_pyramid_tm(comp, config):
    import pyramid_tm

    settings = config.registry.settings

    skip_tm_path_info = (
        '/static/',
        '/favicon.ico',
        '/api/component/pyramid/route',
        '/api/component/pyramid/locdata/',
        '/_debug_toolbar/')

    def activate_hook(request):
        return not request.path_info.startswith(
            skip_tm_path_info)

    settings['tm.activate_hook'] = activate_hook
    settings['tm.annotate_user'] = False

    config.include(pyramid_tm)


def json_js(value, pretty=False):
    """ Mako template function for easy JSON generation

    It can be used as a function ``${json_js(value)}`` or as a filter but in
    conjunction with n-filter ``${value | n, json_js}``."""

    return Markup(dumps(value, pretty=pretty))


def _setup_pyramid_mako(comp, config):
    settings = config.registry.settings

    settings['pyramid.reload_templates'] = comp.env.core.debug
    settings['mako.directories'] = 'nextgisweb:templates/'
    settings['mako.imports'] = [
        'from nextgisweb.i18n import tcheck',
        'from nextgisweb.pyramid.view import json_js',
    ]
    settings['mako.default_filters'] = ['tcheck', 'h'] if comp.env.core.debug else ['h', ]

    import pyramid_mako
    config.include(pyramid_mako)

    # Work around the template lookup bug (test_not_found_unauthorized)
    tsp = 'template/error.mako'
    base = Path(__file__).parent
    config.override_asset(
        to_override=f'nextgisweb:pyramid/{tsp}',
        override_with=str(base / tsp))
