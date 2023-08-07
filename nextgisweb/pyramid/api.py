import base64
import re
from datetime import timedelta

from pyramid.httpexceptions import HTTPBadRequest, HTTPNotFound
from pyramid.response import FileResponse, Response

from nextgisweb.env import DBSession, _, env
from nextgisweb.lib import json

from nextgisweb.core import KindOfData
from nextgisweb.core.exception import ValidationError
from nextgisweb.pyramid import JSONType
from nextgisweb.resource import Resource, ResourceScope

from .util import gensecret, parse_origin


def _get_cors_olist():
    try:
        return env.core.settings_get('pyramid', 'cors_allow_origin')
    except KeyError:
        return None


def check_origin(request, origin):
    if origin is None:
        raise ValueError("Agument origin must have a value")

    olist = _get_cors_olist()

    if not olist:
        return False

    for url in olist:
        if origin == url:
            return True
        if '*' in url:
            o_scheme, o_domain, o_port = parse_origin(origin)[1:]
            scheme, domain, port = parse_origin(url)[1:]
            if o_scheme != scheme or o_port != port:
                continue
            wildcard_level = domain.count('.') + 1
            level_cmp = wildcard_level - 1
            upper = domain.rsplit('.', level_cmp)[-level_cmp:]
            o_upper = o_domain.rsplit('.', level_cmp)[-level_cmp:]
            if upper == o_upper:
                return True
    return False


def cors_tween_factory(handler, registry):
    """ Tween adds Access-Control-* headers for simple and preflighted
    CORS requests """

    def hadd(response, n, v):
        response.headerlist.append((n, v))

    def cors_tween(request):
        origin = request.headers.get('Origin')

        # Only request under /api/ are handled
        is_api = request.path_info.startswith('/api/')

        # If the Origin header is not present terminate this set of
        # steps. The request is outside the scope of this specification.
        # https://www.w3.org/TR/cors/#resource-preflight-requests

        # If there is no Access-Control-Request-Method header
        # or if parsing failed, do not set any additional headers
        # and terminate this set of steps. The request is outside
        # the scope of this specification.
        # http://www.w3.org/TR/cors/#resource-preflight-requests

        if is_api and origin is not None and request.check_origin(origin):
            # If the value of the Origin header is not a
            # case-sensitive match for any of the values
            # in list of origins do not set any additional
            # headers and terminate this set of steps.
            # http://www.w3.org/TR/cors/#resource-preflight-requests

            # Access-Control-Request-Method header of preflight request
            method = request.headers.get('Access-Control-Request-Method')

            if method is not None and request.method == 'OPTIONS':

                response = Response(content_type='text/plain')

                # The Origin header can only contain a single origin as
                # the user agent will not follow redirects.
                # http://www.w3.org/TR/cors/#resource-preflight-requests

                hadd(response, 'Access-Control-Allow-Origin', origin)

                # Add one or more Access-Control-Allow-Methods headers
                # consisting of (a subset of) the list of methods.
                # Since the list of methods can be unbounded,
                # simply returning the method indicated by
                # Access-Control-Request-Method (if supported) can be enough.
                # http://www.w3.org/TR/cors/#resource-preflight-requests

                hadd(response, 'Access-Control-Allow-Methods', method)
                hadd(response, 'Access-Control-Allow-Credentials', 'true')

                # Add allowed Authorization header for HTTP authentication
                # from JavaScript. It is a good idea?

                hadd(response, 'Access-Control-Allow-Headers', 'Authorization, Range')

                return response

            else:

                def set_cors_headers(request, response):
                    hadd(response, 'Access-Control-Allow-Origin', origin)
                    hadd(response, 'Access-Control-Allow-Credentials', 'true')

                request.add_response_callback(set_cors_headers)

        # Run default request handler
        return handler(request)

    return cors_tween


def cors_get(request) -> JSONType:
    request.require_administrator()
    return dict(allow_origin=_get_cors_olist())


def cors_put(request) -> JSONType:
    request.require_administrator()

    body = request.json_body
    for k, v in body.items():
        if k == 'allow_origin':
            if v is None:
                v = []

            if not isinstance(v, list):
                raise HTTPBadRequest(explanation="Invalid key '%s' value!" % k)

            # The scheme and host are case-insensitive
            # and normally provided in lowercase.
            # https://tools.ietf.org/html/rfc7230
            v = [o.lower() for o in v]

            for origin in v:
                if not isinstance(origin, str):
                    raise ValidationError(message="Invalid origin: '%s'." % origin)
                try:
                    is_wildcard, schema, domain, port = parse_origin(origin)
                except ValueError:
                    raise ValidationError(message="Invalid origin: '%s'." % origin)
                if is_wildcard and domain.count('.') < 2:
                    raise ValidationError(
                        message="Second-level and above wildcard domain "
                        "is not supported: '%s'." % origin
                    )

            # Strip trailing slashes
            v = [(o[:-1] if o.endswith('/') else o) for o in v]

            for origin in v:
                if v.count(origin) > 1:
                    raise ValidationError("Duplicate origin '%s'" % origin)

            env.core.settings_set('pyramid', 'cors_allow_origin', v)
        else:
            raise HTTPBadRequest(explanation="Invalid key '%s'" % k)


def system_name_get(request) -> JSONType:
    try:
        full_name = env.core.settings_get('core', 'system.full_name')
    except KeyError:
        full_name = None

    return dict(full_name=full_name)


def system_name_put(request) -> JSONType:
    request.require_administrator()

    body = request.json_body
    for k, v in body.items():
        if k == 'full_name':
            if v is not None and v != "":
                env.core.settings_set('core', 'system.full_name', v)
            else:
                env.core.settings_delete('core', 'system.full_name')
        else:
            raise HTTPBadRequest(explanation="Invalid key '%s'" % k)


def home_path_get(request) -> JSONType:
    request.require_administrator()
    try:
        home_path = env.core.settings_get('pyramid', 'home_path')
    except KeyError:
        home_path = None
    return dict(home_path=home_path)


def home_path_put(request) -> JSONType:
    request.require_administrator()

    body = request.json_body
    for k, v in body.items():
        if k == 'home_path':
            if v:
                env.core.settings_set('pyramid', 'home_path', v)
            else:
                env.core.settings_delete('pyramid', 'home_path')
        else:
            raise HTTPBadRequest(explanation="Invalid key '%s'" % k)


def settings(request) -> JSONType:
    identity = request.GET.get('component')
    if identity is None:
        raise ValidationError(message=_(
            "Required parameter 'component' is missing."))

    comp = request.env.components.get(identity)
    if comp is None:
        raise ValidationError(message=_("Invalid component identity."))

    return comp.client_settings(request)


def route(request) -> JSONType:
    return request.env.pyramid.route_meta


def pkg_version(request) -> JSONType:
    return dict([(p.name, p.version) for p in request.env.packages.values()])


def healthcheck(request) -> JSONType:
    components = [
        comp for comp in env.components.values()
        if hasattr(comp, 'healthcheck')]

    result = dict(success=True)
    result['component'] = dict()

    for comp in components:
        cresult = comp.healthcheck()
        result['success'] = result['success'] and cresult['success']
        result['component'][comp.identity] = cresult

    if not result['success']:
        request.response.status_code = 503
    return result


def statistics(request) -> JSONType:
    request.require_administrator()

    result = dict()
    for comp in request.env.components.values():
        if hasattr(comp, 'query_stat'):
            result[comp.identity] = comp.query_stat()
    return result


def require_storage_enabled(request):
    if not request.env.core.options['storage.enabled']:
        raise HTTPNotFound()


def estimate_storage(request) -> JSONType:
    require_storage_enabled(request)
    request.require_administrator()

    request.env.core.start_estimation()


def storage_status(request) -> JSONType:
    require_storage_enabled(request)
    request.require_administrator()

    return dict(estimation_running=request.env.core.estimation_running())


def storage(request) -> JSONType:
    require_storage_enabled(request)
    request.require_administrator()
    return dict((k, v) for k, v in request.env.core.query_storage().items())


def kind_of_data(request) -> JSONType:
    request.require_administrator()

    result = dict()
    for item in KindOfData.registry.values():
        result[item.identity] = request.localizer.translate(item.display_name)
    return result


def custom_css_get(request):
    try:
        body = request.env.core.settings_get('pyramid', 'custom_css')
    except KeyError:
        body = ""

    is_json = request.GET.get('format', 'css').lower() == 'json'
    if is_json:
        response = Response(json.dumpb(body), content_type='application/json')
    else:
        response = Response(body, content_type='text/css', charset='utf-8')

    if (
        'ckey' in request.GET
        and request.GET['ckey'] == request.env.core.settings_get('pyramid', 'custom_css.ckey')
    ):
        response.cache_control.public = True
        response.cache_control.max_age = int(timedelta(days=1).total_seconds())

    return response


def custom_css_put(request):
    request.require_administrator()

    is_json = request.GET.get('format', 'css').lower() == 'json'
    data = request.json_body if is_json else request.body.decode(request.charset)

    if data is None or re.match(r'^\s*$', data, re.MULTILINE):
        request.env.core.settings_delete('pyramid', 'custom_css')
    else:
        request.env.core.settings_set('pyramid', 'custom_css', data)

    request.env.core.settings_set('pyramid', 'custom_css.ckey', gensecret(8))

    if is_json:
        return Response(json.dumpb(None), content_type="application/json")
    else:
        return Response()


def logo_get(request):
    try:
        logodata = request.env.core.settings_get('pyramid', 'logo')
    except KeyError:
        raise HTTPNotFound()

    bindata = base64.b64decode(logodata)
    response = Response(bindata, content_type='image/png')

    if (
        'ckey' in request.GET
        and request.GET['ckey'] == request.env.core.settings_get('pyramid', 'logo.ckey')
    ):
        response.cache_control.public = True
        response.cache_control.max_age = int(timedelta(days=1).total_seconds())

    return response


def logo_put(request):
    request.require_administrator()

    value = request.json_body

    if value is None:
        request.env.core.settings_delete('pyramid', 'logo')

    else:
        fn, fnmeta = request.env.file_upload.get_filename(value['id'])
        with open(fn, 'rb') as fd:
            data = base64.b64encode(fd.read())
            request.env.core.settings_set(
                'pyramid', 'logo',
                data.decode('utf-8'))

    request.env.core.settings_set('pyramid', 'logo.ckey', gensecret(8))

    return Response()


def company_logo(request):
    response = None
    company_logo_view = request.env.pyramid.company_logo_view
    if company_logo_view is not None:
        try:
            response = company_logo_view(request)
        except HTTPNotFound:
            pass

    if response is None:
        default = request.env.pyramid.resource_path('asset/logo_outline.png')
        response = FileResponse(default)

    if (
        'ckey' in request.GET
        and request.GET['ckey'] == request.env.core.settings_get('pyramid', 'company_logo.ckey')
    ):
        response.cache_control.public = True
        response.cache_control.max_age = int(timedelta(days=1).total_seconds())

    return response


def setup_pyramid(comp, config):
    config.add_request_method(check_origin)

    config.add_tween('nextgisweb.pyramid.api.cors_tween_factory', under=(
        'nextgisweb.pyramid.exception.handled_exception_tween_factory',
        'INGRESS'))

    config.add_route(
        'pyramid.cors',
        '/api/component/pyramid/cors',
        get=cors_get,
        put=cors_put)

    config.add_route(
        'pyramid.system_name',
        '/api/component/pyramid/system_name',
        get=system_name_get,
        put=system_name_put)

    config.add_route(
        'pyramid.settings',
        '/api/component/pyramid/settings',
        get=settings)

    config.add_route(
        'pyramid.route',
        '/api/component/pyramid/route',
        get=route)

    config.add_route(
        'pyramid.pkg_version',
        '/api/component/pyramid/pkg_version',
        get=pkg_version)

    config.add_route(
        'pyramid.healthcheck',
        '/api/component/pyramid/healthcheck',
        get=healthcheck)

    config.add_route(
        'pyramid.statistics',
        '/api/component/pyramid/statistics',
        get=statistics)

    config.add_route(
        'pyramid.estimate_storage',
        '/api/component/pyramid/estimate_storage',
        post=estimate_storage)

    config.add_route(
        'pyramid.storage_status',
        '/api/component/pyramid/storage_status',
        get=storage_status)

    config.add_route(
        'pyramid.storage',
        '/api/component/pyramid/storage',
        get=storage)

    config.add_route(
        'pyramid.kind_of_data',
        '/api/component/pyramid/kind_of_data',
        get=kind_of_data)

    config.add_route(
        'pyramid.custom_css',
        '/api/component/pyramid/custom_css',
        get=custom_css_get,
        put=custom_css_put)

    config.add_route(
        'pyramid.logo',
        '/api/component/pyramid/logo',
        get=logo_get,
        put=logo_put)

    # Methods for customization in components
    comp.company_logo_enabled = lambda request: True
    comp.company_logo_view = None
    comp.company_url_view = lambda request: comp.options['company_url']

    comp.help_page_url_view = lambda request: \
        comp.options['help_page.url'] if comp.options['help_page.enabled'] else None

    def preview_link_view(request):
        defaults = comp.preview_link_default_view(request)

        if (
            hasattr(request, 'context')
            and isinstance(request.context, Resource)
            and request.context in DBSession
        ):
            if not request.context.has_permission(ResourceScope.read, request.user):
                return dict(image=None, description=None)

            social = request.context.social
            if social is not None:
                image = request.route_url(
                    'resource.preview', id=request.context.id,
                    _query=str(social.preview_fileobj_id)) \
                    if social.preview_fileobj is not None else defaults['image']
                description = social.preview_description \
                    if social.preview_description is not None else defaults['description']
                return dict(
                    image=image,
                    description=description
                )
        return defaults

    comp.preview_link_default_view = lambda request: dict(
        image=request.static_url('asset/pyramid/webgis-for-social.png'),
        description=_("Your Web GIS at nextgis.com"))

    comp.preview_link_view = preview_link_view

    config.add_route(
        'pyramid.company_logo',
        '/api/component/pyramid/company_logo',
        get=company_logo)

    # TODO: Add PUT method for changing custom_css setting and GUI

    config.add_route(
        'pyramid.home_path',
        '/api/component/pyramid/home_path',
        get=home_path_get,
        put=home_path_put)
