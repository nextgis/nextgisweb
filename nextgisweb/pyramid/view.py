# -*- coding: utf-8 -*-
from __future__ import division, absolute_import, print_function, unicode_literals
import os.path
from time import sleep
from datetime import datetime, timedelta

from pyramid.response import Response, FileResponse
from pyramid.httpexceptions import HTTPFound, HTTPNotFound

from .. import dynmenu as dm
from ..core.exception import UserException

from .util import _


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
        distinfo=request.env.pyramid.distinfo,
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
        comp.control_panel.add(dm.Link('info/backups', _("Backups"), lambda args: 
            args.request.route_url('pyramid.control_panel.backup.browse')))
