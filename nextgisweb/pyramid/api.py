# -*- coding: utf-8 -*-
from __future__ import unicode_literals
import re
import json
import os.path
from urllib2 import unquote

from pyramid.response import Response, FileResponse

from .util import ClientRoutePredicate


def settings(request):
    comp = request.env._components[request.GET['component']]
    return comp.client_settings(request)


def route(request):
    result = dict()
    route_re = re.compile(r'\{(\w+):{0,1}')
    introspector = request.registry.introspector
    for itm in introspector.get_category('routes'):
        route = itm['introspectable']['object']
        client_predicate = False
        for p in route.predicates:
            if isinstance(p, ClientRoutePredicate):
                client_predicate = True
        api_pattern = route.pattern.startswith('/api/')
        if api_pattern or client_predicate:
            if api_pattern and client_predicate:
                request.env.pyramid.logger.warn(
                    "API route '%s' has useless 'client' predicate!",
                    route.name)
            kys = route_re.findall(route.path)
            kvs = dict(
                (k, '{%d}' % idx)
                for idx, k in enumerate(kys))
            tpl = unquote(route.generate(kvs))
            result[route.name] = [tpl, ] + kys

    return result


def locdata(request):
    locale = request.matchdict['locale']
    component = request.matchdict['component']
    introspector = request.registry.introspector
    for itm in introspector.get_category('translation directories'):
        tdir = itm['introspectable']['directory']
        jsonpath = os.path.normpath(os.path.join(
            tdir, locale, 'LC_MESSAGES', component) + '.jed')
        if os.path.isfile(jsonpath):
            return FileResponse(
                jsonpath, content_type=b'application/json')

    # Для английской локали по-умолчанию возвращаем пустой перевод, если
    # реальный файл перевода не найден. Такое может быть нужно, если вместо
    # строк на английском будем использовать msgid.

    if locale == 'en':
        return Response(json.dumps({"": {
            "domain": component,
            "lang": "en",
            "plural_forms": "nplurals=2; plural=(n != 1);"
        }}), content_type=b'application/json')

    return Response(json.dumps(dict(
        error="Locale data not found!"
    )), status_code=404, content_type=b'application/json')


def setup_pyramid(comp, config):
    config.add_route('pyramid.settings', '/api/component/pyramid/settings') \
        .add_view(settings, renderer='json')

    config.add_route('pyramid.route', '/api/component/pyramid/route') \
        .add_view(route, renderer='json')

    config.add_route(
        'pyramid.locdata',
        '/api/component/pyramid/locdata/{component}/{locale}',
    ).add_view(locdata, renderer='json')
