# -*- coding: utf-8 -*-
from __future__ import unicode_literals
import os.path

from pyramid.response import FileResponse
from pyramid.httpexceptions import HTTPNotFound, HTTPForbidden

from .. import dynmenu as dm

from .util import ClientRoutePredicate


def settings(request):
    comp = request.env._components[request.GET['component']]
    return comp.client_settings(request)


def routes(request):
    result = dict()
    introspector = request.registry.introspector
    for itm in introspector.get_category('routes'):
        route = itm['introspectable']['object']
        for p in route.predicates:
            if isinstance(p, ClientRoutePredicate):
                result[route.name] = dict(
                    pattern=route.generate(dict(
                        [(k, '__%s__' % k)
                         for k in p.val])),
                    keys=p.val)
    return result


def control_panel(request):
    if not request.user.is_administrator:
        raise HTTPForbidden()

    return dict(
        title="Панель управления",
        control_panel=request.env.pyramid.control_panel)


def help_page(request):
    return dict(
        title="Справка",
        help_page=request.env.pyramid.help_page)


def logo(request):
    settings = request.env.pyramid.settings
    if 'logo' in settings and os.path.isfile(settings['logo']):
        return FileResponse(settings['logo'], request=request)
    else:
        raise HTTPNotFound()


def favicon(request):
    settings = request.env.pyramid.settings
    if 'favicon' in settings and os.path.isfile(settings['favicon']):
        return FileResponse(
            settings['favicon'], request=request,
            content_type=bytes('image/x-icon'))
    else:
        raise HTTPNotFound()


def pkginfo(request):
    return dict(
        title=u"Версии пакетов",
        pkginfo=request.env.pyramid.pkginfo,
        dynmenu=request.env.pyramid.control_panel)


def setup_pyramid(comp, config):
    config.add_route('pyramid.settings', '/settings') \
        .add_view(settings, renderer='json')

    config.add_route('pyramid.routes', '/pyramid/routes') \
        .add_view(routes, renderer='json', json=True)

    config.add_route('pyramid.control_panel', '/control-panel') \
        .add_view(control_panel, renderer="pyramid/control_panel.mako")

    config.add_route('pyramid.help_page', '/help-page') \
        .add_view(help_page, renderer="pyramid/help_page.mako")

    config.add_route('pyramid.logo', '/logo').add_view(logo)

    config.add_route('pyramid.favicon', '/favicon.ico').add_view(favicon)

    config.add_route('pyramid.pkginfo', '/sys/pkginfo') \
        .add_view(pkginfo, renderer="pyramid/pkginfo.mako")

    comp.control_panel = dm.DynMenu(
        dm.Label('sys', u"Информация о системе"),

        dm.Link('sys/pkginfo', u"Версии пакетов", lambda args: (
            args.request.route_url('pyramid.pkginfo'))),
    )
