# -*- coding: utf-8 -*-
from __future__ import unicode_literals
import codecs
import os.path

from pyramid.response import FileResponse
from pyramid.httpexceptions import HTTPFound, HTTPNotFound, HTTPForbidden

from pkg_resources import resource_filename

from .. import dynmenu as dm

from .util import _, ClientRoutePredicate


def home(request):
    home_url = request.env.pyramid.settings.get('home_url')
    if home_url is not None:
        return HTTPFound(request.application_url + home_url)
    else:
        return HTTPFound(location=request.route_url('resource.show', id=0))


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
        title=_("Control panel"),
        control_panel=request.env.pyramid.control_panel)


def help_page(request):
    with codecs.open(
        request.env.pyramid.help_page[request.locale_name], 'rb', 'utf-8'
        ) as fp:
        help_page = fp.read()
    return dict(title=_("Help"), help_page=help_page)


def logo(request):
    settings = request.env.pyramid.settings
    if 'logo' in settings and os.path.isfile(settings['logo']):
        return FileResponse(settings['logo'], request=request)
    else:
        raise HTTPNotFound()


def favicon(request):
    settings = request.env.pyramid.settings
    if 'favicon' not in settings:
        settings['favicon'] = resource_filename(
            'nextgisweb', 'static/img/favicon.ico')

    if os.path.isfile(settings['favicon']):
        return FileResponse(
            settings['favicon'], request=request,
            content_type=bytes('image/x-icon'))
    else:
        raise HTTPNotFound()


def locale(request):
    def set_cookie(reqest, response):
        response.set_cookie('_LOCALE_', request.matchdict['locale'])
    request.add_response_callback(set_cookie)
    return HTTPFound(location=request.GET['next'])


def pkginfo(request):
    return dict(
        title=_("Package versions"),
        distinfo=request.env.pyramid.distinfo,
        dynmenu=request.env.pyramid.control_panel)


def setup_pyramid(comp, config):
    config.add_route('home', '/').add_view(home)

    config.add_route('pyramid.routes', '/pyramid/routes') \
        .add_view(routes, renderer='json', json=True)

    ctpl = lambda (n): 'nextgisweb:pyramid/template/%s.mako' % n

    config.add_route('pyramid.control_panel', '/control-panel') \
        .add_view(control_panel, renderer=ctpl('control_panel'))

    config.add_route('pyramid.help_page', '/help-page') \
        .add_view(help_page, renderer=ctpl('help_page'))

    config.add_route('pyramid.logo', '/logo').add_view(logo)

    config.add_route('pyramid.favicon', '/favicon.ico').add_view(favicon)

    config.add_route('pyramid.pkginfo', '/sys/pkginfo') \
        .add_view(pkginfo, renderer=ctpl('pkginfo'))

    config.add_route('pyramid.locale', '/locale/{locale}').add_view(locale)

    comp.control_panel = dm.DynMenu(
        dm.Label('sys', _("System info")),

        dm.Link('sys/pkginfo', _("Package versions"), lambda args: (
            args.request.route_url('pyramid.pkginfo'))),
    )
