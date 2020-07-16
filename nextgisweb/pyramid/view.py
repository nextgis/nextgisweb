# -*- coding: utf-8 -*-
from __future__ import division, absolute_import, print_function, unicode_literals
import sys
import errno
import os.path
from time import sleep
from datetime import datetime, timedelta
from pkg_resources import resource_filename
from six import reraise

from pyramid.response import Response, FileResponse
from pyramid.authorization import ACLAuthorizationPolicy
from pyramid.events import BeforeRender
from pyramid.httpexceptions import HTTPFound, HTTPNotFound

from .. import dynmenu as dm
from ..core.exception import UserException
from ..package import amd_packages
from ..compat import lru_cache

from . import exception
from .session import WebSession
from .renderer import json_renderer
from .util import _, gensecret, pip_freeze


def static_amd_file(request):
    subpath = request.matchdict['subpath']
    amd_package_name = subpath[0]
    amd_package_path = '/'.join(subpath[1:])

    ap_base_path = _amd_package_path(amd_package_name)
    if ap_base_path is None:
        raise HTTPNotFound()

    try:
        return FileResponse(
            os.path.join(ap_base_path, amd_package_path),
            cache_max_age=3600, request=request)
    except (OSError, IOError) as exc:
        if exc.errno in (errno.ENOENT, errno.EISDIR):
            raise HTTPNotFound()
        reraise(*sys.exc_info())


@lru_cache(maxsize=64)
def _amd_package_path(name):
    for p, asset in amd_packages():
        if p == name:
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
    return HTTPFound(location=request.GET['next'])


def pkginfo(request):
    request.require_administrator()
    return dict(
        title=_("Package versions"),
        distinfo=pip_freeze()[1],
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
        title=_("Cross-origin resource sharing (CORS)"),
        dynmenu=request.env.pyramid.control_panel)


def custom_css(request):
    request.require_administrator()
    return dict(
        title=_("Custom CSS"),
        dynmenu=request.env.pyramid.control_panel)


def cp_logo(request):
    request.require_administrator()
    return dict(
        title=_("Custom logo"),
        dynmenu=request.env.pyramid.control_panel)


def system_name(request):
    request.require_administrator()
    return dict(
        title=_("Web GIS name"),
        dynmenu=request.env.pyramid.control_panel)


def miscellaneous(request):
    request.require_administrator()
    return dict(
        title=_("Miscellaneous"),
        dynmenu=request.env.pyramid.control_panel)


def home_path(request):
    request.require_administrator()
    return dict(
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


def test_timeout(reqest):
    logger = reqest.env.pyramid.logger

    duration = float(reqest.GET.get('t', '60'))
    interval = float(reqest.GET['i']) if 'i' in reqest.GET else None

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
            yield str(line + "\n")

    return Response(app_iter=generator(), content_type='text/plain')


def setup_pyramid(comp, config):
    env = comp.env
    is_debug = env.core.debug

    # Session factory
    config.set_session_factory(WebSession)

    # Empty authorization policy. Why do we need this?
    # NOTE: Authentication policy is set up in then authentication component!
    authz_policy = ACLAuthorizationPolicy()
    config.set_authorization_policy(authz_policy)

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

    config.add_tween(
        'nextgisweb.pyramid.util.header_encoding_tween_factory',
        over=('nextgisweb.pyramid.exception.unhandled_exception_tween_factory', ))

    # INTERNATIONALIZATION

    # Substitute localizer from pyramid with our own, original is
    # too tied to translationstring, that works strangely with string
    # interpolation via % operator.
    def localizer(request):
        return request.env.core.localizer(request.locale_name)
    config.add_request_method(localizer, 'localizer', property=True)

    # Replace default locale negotiator with session-based one
    def locale_negotiator(request):
        return request.session.get(
            'pyramid.locale',
            env.core.locale_default)
    config.set_locale_negotiator(locale_negotiator)

    # TODO: Need to get rid of translation dirs!
    # Currently used only to search for jed-files.
    from ..package import pkginfo as _pkginfo
    for pkg in _pkginfo.packages:
        dirname = resource_filename(pkg, 'locale')
        if os.path.isdir(dirname):
            config.add_translation_dirs(dirname)

    # STATIC FILES

    comp.static_key = '/' + (pip_freeze()[0] if not is_debug else gensecret(8))

    config.add_static_view(
        '/static{}/asset'.format(comp.static_key),
        'nextgisweb:static', cache_max_age=3600)

    config.add_route('amd_package', '/static{}/amd/*subpath'.format(comp.static_key)) \
        .add_view(static_amd_file)

    # Collect external AMD-packages from other components
    amd_base = []
    for c in comp._env.chain('amd_base'):
        amd_base.extend(c.amd_base)

    config.add_request_method(
        lambda r: amd_base, 'amd_base',
        property=True, reify=True)

    # RENDERERS

    config.add_renderer('json', json_renderer)

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
        'pyramid.control_panel.pkginfo',
        '/control-panel/pkginfo'
    ).add_view(pkginfo, renderer=ctpl('pkginfo'))

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
        '/control-panel/cors'
    ).add_view(cors, renderer=ctpl('cors'))

    config.add_route(
        'pyramid.control_panel.custom_css',
        '/control-panel/custom-css'
    ).add_view(custom_css, renderer=ctpl('custom_css'))

    config.add_route(
        'pyramid.control_panel.logo',
        '/control-panel/logo'
    ).add_view(cp_logo, renderer=ctpl('logo'))

    config.add_route(
        'pyramid.control_panel.system_name',
        '/control-panel/system-name'
    ).add_view(system_name, renderer=ctpl('system_name'))

    config.add_route(
        'pyramid.control_panel.miscellaneous',
        '/control-panel/miscellaneous'
    ).add_view(miscellaneous, renderer=ctpl('miscellaneous'))

    config.add_route(
        'pyramid.control_panel.home_path',
        '/control-panel/home_path'
    ).add_view(home_path, renderer=ctpl('home_path'))

    config.add_route('pyramid.locale', '/locale/{locale}').add_view(locale)

    comp.test_request_handler = None
    config.add_route('pyramid.test_request', '/test/request/') \
        .add_view(test_request)

    config.add_route('pyramid.test_exception_handled', '/test/exception/handled') \
        .add_view(test_exception_handled)
    config.add_route('pyramid.test_exception_unhandled', '/test/exception/unhandled') \
        .add_view(test_exception_unhandled)
    config.add_route('pyramid.test_timeout', '/test/timeout') \
        .add_view(test_timeout)

    # Method for help_page customization in components
    comp.help_page_url = lambda request: \
        comp.options['help_page.url'] if comp.options['help_page.enabled'] else None

    comp.control_panel = dm.DynMenu(
        dm.Label('info', _("Info")),
        dm.Link('info/pkginfo', _("Package versions"), lambda args: (
            args.request.route_url('pyramid.control_panel.pkginfo'))),

        dm.Label('settings', _("Settings")),
        dm.Link('settings/core', _("Web GIS name"), lambda args: (
            args.request.route_url('pyramid.control_panel.system_name'))),
        dm.Link('settings/cors', _("Cross-origin resource sharing (CORS)"), lambda args: (
            args.request.route_url('pyramid.control_panel.cors'))),
        dm.Link('settings/custom_css', _("Custom CSS"), lambda args: (
            args.request.route_url('pyramid.control_panel.custom_css'))),
        dm.Link('settings/logo', _("Custom logo"), lambda args: (
            args.request.route_url('pyramid.control_panel.logo'))),
        dm.Link('settings/miscellaneous', _("Miscellaneous"), lambda args: (
            args.request.route_url('pyramid.control_panel.miscellaneous'))),
        dm.Link('settings/home_path', _("Home path"), lambda args: (
            args.request.route_url('pyramid.control_panel.home_path'))),
    )

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
    config.include(pyramid_tm)


def _setup_pyramid_mako(comp, config):
    settings = config.registry.settings

    settings['pyramid.reload_templates'] = comp.env.core.debug
    settings['mako.directories'] = 'nextgisweb:templates/'
    settings['mako.imports'] = ['import six', 'from nextgisweb.i18n import tcheck']
    settings['mako.default_filters'] = ['tcheck', 'h'] if comp.env.core.debug else ['h', ]

    import pyramid_mako
    config.include(pyramid_mako)
