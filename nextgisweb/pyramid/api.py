# -*- coding: utf-8 -*-
from __future__ import unicode_literals
import re
import json
import os.path
from urllib2 import unquote

from pyramid.response import Response, FileResponse
from pyramid.httpexceptions import HTTPForbidden, HTTPBadRequest

from ..env import env
from ..package import pkginfo

from .util import ClientRoutePredicate


def _get_cors_olist():
    try:
        return env.core.settings_get('pyramid', 'cors_allow_origin')
    except KeyError:
        return None


def cors_tween_factory(handler, registry):
    """ Tween adds Access-Control-* headers for simple and preflighted
    CORS requests """

    def cors_tween(request):
        # Only request under /api/ are handled
        is_api = request.path_info.startswith('/api/')

        # Origin header required in CORS requests
        origin = request.headers.get('Origin')

        # Access-Control-Request-Method header of preflight request
        method = request.headers.get('Access-Control-Request-Method')

        # If the Origin header is not present terminate this set of
        # steps. The request is outside the scope of this specification.
        # https://www.w3.org/TR/cors/#resource-preflight-requests

        # If there is no Access-Control-Request-Method header
        # or if parsing failed, do not set any additional headers
        # and terminate this set of steps. The request is outside
        # the scope of this specification.
        # http://www.w3.org/TR/cors/#resource-preflight-requests
        if (is_api and origin is not None and method is not None and
                request.method == 'OPTIONS'):
            # TODO: Add route matching othervise OPTIONS can return 200 OK
            # other method 404 Not found

            olist = _get_cors_olist()

            # If the value of the Origin header is not a
            # case-sensitive match for any of the values
            # in list of origins do not set any additional
            # headers and terminate this set of steps.
            # http://www.w3.org/TR/cors/#resource-preflight-requests
            if olist is not None and origin in olist:
                response = Response(content_type=b'text/plain')

                def hadd(n, v):
                    response.headerlist.append((str(n), str(v)))

                # The Origin header can only contain a single origin as
                # the user agent will not follow redirects.
                # http://www.w3.org/TR/cors/#resource-preflight-requests
                hadd('Access-Control-Allow-Origin', origin)

                # Add one or more Access-Control-Allow-Methods headers
                # consisting of (a subset of) the list of methods.
                # Since the list of methods can be unbounded,
                # simply returning the method indicated by
                # Access-Control-Request-Method (if supported) can be enough.
                # http://www.w3.org/TR/cors/#resource-preflight-requests
                hadd('Access-Control-Allow-Methods', method)

                if '*' not in olist:
                    hadd('Access-Control-Allow-Credentials', 'true')

                return response

        # Run default request handler
        response = handler(request)

        if is_api and origin is not None:
            olist = _get_cors_olist()

            if olist is not None and origin in olist:
                response.headerlist.append((
                    str('Access-Control-Allow-Origin'),
                    str(origin)))
                if '*' not in olist:
                    response.headerlist.append((
                        str('Access-Control-Allow-Credentials'),
                        str('true')))

        return response

    return cors_tween


def cors_get(request):
    request.require_administrator()
    return dict(allow_origin=_get_cors_olist())


def cors_put(request):
    request.require_administrator()

    body = request.json_body
    for k, v in body.iteritems():
        if k == 'allow_origin':
            if v is None:
                v = []

            if not isinstance(v, list):
                raise HTTPBadRequest("Invalid key '%s' value!" % k)

            # The scheme and host are case-insensitive
            # and normally provided in lowercase.
            # https://tools.ietf.org/html/rfc7230
            v = [o.lower() for o in v]

            for origin in v:
                if (
                    not isinstance(origin, basestring) or
                    not re.match(
                        r'^https?://[\w\_\-\.]{3,}(:\d{2,5})?$', origin)
                ):
                    raise HTTPBadRequest("Invalid origin '%s'" % origin)

                if v.count(origin) != 1:
                    raise HTTPBadRequest("Duplicate origin '%s'" % origin)

            env.core.settings_set('pyramid', 'cors_allow_origin', v)
        else:
            raise HTTPBadRequest("Invalid key '%s'" % k)


def system_name_get(request):
    request.require_administrator()
    return dict(full_name=env.core.settings_get('core', 'system.full_name'))


def system_name_put(request):
    request.require_administrator()

    body = request.json_body
    for k, v in body.iteritems():
        if k == 'full_name':
            if v is None:
                v = ''

            env.core.settings_set('core', 'system.full_name', v)
        else:
            raise HTTPBadRequest("Invalid key '%s'" % k)


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

    # For english locale by default return empty translation, if
    # real translation file was not found. This might be needed if
    # instead of English strings we'll use msgid.

    if locale == 'en':
        return Response(json.dumps({"": {
            "domain": component,
            "lang": "en",
            "plural_forms": "nplurals=2; plural=(n != 1);"
        }}), content_type=b'application/json')

    return Response(json.dumps(dict(
        error="Locale data not found!"
    )), status_code=404, content_type=b'application/json')


def pkg_version(request):
    return dict([(p, pkginfo.pkg_version(p)) for p in pkginfo.packages])


def statistics(request):
    request.require_administrator()

    result = dict()
    for comp in request.env._components.values():
        if hasattr(comp, 'query_stat'):
            result[comp.identity] = comp.query_stat()
    return result


def setup_pyramid(comp, config):
    config.add_tween('nextgisweb.pyramid.api.cors_tween_factory')

    config.add_route('pyramid.cors', '/api/component/pyramid/cors') \
        .add_view(cors_get, request_method='GET', renderer='json') \
        .add_view(cors_put, request_method='PUT', renderer='json')

    config.add_route('pyramid.system_name',
                     '/api/component/pyramid/system_name') \
        .add_view(system_name_get, request_method='GET', renderer='json') \
        .add_view(system_name_put, request_method='PUT', renderer='json')

    config.add_route('pyramid.settings', '/api/component/pyramid/settings') \
        .add_view(settings, renderer='json')

    config.add_route('pyramid.route', '/api/component/pyramid/route') \
        .add_view(route, renderer='json', request_method='GET')

    config.add_route(
        'pyramid.locdata',
        '/api/component/pyramid/locdata/{component}/{locale}',
    ).add_view(locdata, renderer='json')

    config.add_route(
        'pyramid.pkg_version',
        '/api/component/pyramid/pkg_version',
    ).add_view(pkg_version, renderer='json')

    config.add_route(
        'pyramid.statistics',
        '/api/component/pyramid/statistics',
    ).add_view(statistics, renderer='json')
