import base64
import re
from datetime import timedelta
from typing import Any, Dict, List, Optional, TypedDict, Union

from msgspec import UNSET, Meta, Struct, UnsetType, convert, to_builtins
from pyramid.httpexceptions import HTTPNotFound
from pyramid.response import FileResponse, Response
from typing_extensions import Annotated

from nextgisweb.env import DBSession, _, env
from nextgisweb.lib.apitype import AnyOf, AsJSON, ContentType, StatusCode

from nextgisweb.core import KindOfData
from nextgisweb.core.exception import ValidationError
from nextgisweb.pyramid import JSONType
from nextgisweb.resource import Resource, ResourceScope

from .util import gensecret, parse_origin

CKey = Annotated[
    str,
    Meta(
        title="CKey",
        description=(
            "An unique hash key for content. If the requested content key mathes "
            "the current, the server will set caching headers."
        ),
    ),
]


def _get_cors_olist():
    try:
        return env.core.settings_get("pyramid", "cors_allow_origin")
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
        if "*" in url:
            o_scheme, o_domain, o_port = parse_origin(origin)[1:]
            scheme, domain, port = parse_origin(url)[1:]
            if o_scheme != scheme or o_port != port:
                continue
            wildcard_level = domain.count(".") + 1
            level_cmp = wildcard_level - 1
            upper = domain.rsplit(".", level_cmp)[-level_cmp:]
            o_upper = o_domain.rsplit(".", level_cmp)[-level_cmp:]
            if upper == o_upper:
                return True
    return False


def cors_tween_factory(handler, registry):
    """Tween adds Access-Control-* headers for simple and preflighted
    CORS requests"""

    def hadd(response, n, v):
        response.headerlist.append((n, v))

    def cors_tween(request):
        origin = request.headers.get("Origin")

        # Only request under /api/ are handled
        is_api = request.path_info.startswith("/api/")

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
            method = request.headers.get("Access-Control-Request-Method")

            if method is not None and request.method == "OPTIONS":
                response = Response(content_type="text/plain")

                # The Origin header can only contain a single origin as
                # the user agent will not follow redirects.
                # http://www.w3.org/TR/cors/#resource-preflight-requests

                hadd(response, "Access-Control-Allow-Origin", origin)

                # Add one or more Access-Control-Allow-Methods headers
                # consisting of (a subset of) the list of methods.
                # Since the list of methods can be unbounded,
                # simply returning the method indicated by
                # Access-Control-Request-Method (if supported) can be enough.
                # http://www.w3.org/TR/cors/#resource-preflight-requests

                hadd(response, "Access-Control-Allow-Methods", method)
                hadd(response, "Access-Control-Allow-Credentials", "true")

                # Add allowed Authorization header for HTTP authentication
                # from JavaScript. It is a good idea?

                hadd(response, "Access-Control-Allow-Headers", "Authorization, Range")

                return response

            else:

                def set_cors_headers(request, response):
                    hadd(response, "Access-Control-Allow-Origin", origin)
                    hadd(response, "Access-Control-Allow-Credentials", "true")

                request.add_response_callback(set_cors_headers)

        # Run default request handler
        return handler(request)

    return cors_tween


# fmt: off
ORIGIN_RE = (
    r"^SCHEME(?:(\*\.)?(HOST\.)*(HOST)\.?|(IPv4))(:PORT)?\/?$"
    .replace("SCHEME", r"https?:\/\/")
    .replace("HOST", r"[_a-z-][_a-z0-9-]*")
    .replace("IPv4", r"((25[0-5]|(2[0-4]|1\d|[1-9]|)\d)\.?\b){4}")
    .replace("PORT", r"([1-9]|[1-9]\d{1,3}|[1-5]\d{4}|6[0-4]\d{3}|65[0-4]\d{2}|655[0-2]\d|6553[0-5])")
)
# fmt: on

Origin = Annotated[
    str,
    Meta(
        pattern=ORIGIN_RE,
        description=(
            "An origin including scheme, domain and optional port if differs "
            "from the default (80 for HTTP and 443 for HTTPS). Wildcards are "
            "allowed on the third level and below."
        ),
        examples=["https://example.com", "https://*.example.com"],
    ),
]


class CORSSettings(TypedDict):
    allow_origin: Annotated[List[Origin], Meta(description="The list of allowed origins")]


def cors_get(request) -> CORSSettings:
    """Read CORS settings"""
    request.require_administrator()
    return CORSSettings(allow_origin=_get_cors_olist())


def cors_put(request, body: CORSSettings) -> JSONType:
    """Update CORS settings"""
    request.require_administrator()

    v = [o.lower().rstrip("/") for o in body["allow_origin"]]
    for origin in v:
        if v.count(origin) > 1:
            raise ValidationError("Duplicate origin '%s'" % origin)

    env.core.settings_set("pyramid", "cors_allow_origin", v)


class SystemNameSettings(TypedDict):
    full_name: Optional[str]


def system_name_get(request) -> AsJSON[SystemNameSettings]:
    """Read system name settings"""
    try:
        value = env.core.settings_get("core", "system.full_name")
    except KeyError:
        value = None
    return SystemNameSettings(full_name=value)


def system_name_put(request, body: SystemNameSettings) -> JSONType:
    """Update system name settings"""
    request.require_administrator()

    if value := body["full_name"]:
        env.core.settings_set("core", "system.full_name", value)
    else:
        env.core.settings_delete("core", "system.full_name")


class HomePathSettings(TypedDict):
    home_path: Optional[str]


def home_path_get(request) -> AsJSON[HomePathSettings]:
    """Read home path settings"""
    try:
        value = env.core.settings_get("pyramid", "home_path")
    except KeyError:
        value = None
    return HomePathSettings(home_path=value)


def home_path_put(request, body: HomePathSettings) -> JSONType:
    """Update home path settings"""
    request.require_administrator()

    if value := body["home_path"]:
        env.core.settings_set("pyramid", "home_path", value)
    else:
        env.core.settings_delete("pyramid", "home_path")


class GoogleAnalytics(Struct):
    id: str


class YandexMetrica(Struct):
    id: str
    webvisor: bool


class MetricsSettings(Struct):
    google_analytics: Union[GoogleAnalytics, UnsetType] = UNSET
    yandex_metrica: Union[YandexMetrica, UnsetType] = UNSET


def metrics_get(request) -> MetricsSettings:
    request.require_administrator()

    try:
        value = env.core.settings_get("pyramid", "metrics")
    except KeyError:
        value = {}

    return convert(value, MetricsSettings)


def metrics_put(request, *, body: MetricsSettings) -> JSONType:
    request.require_administrator()

    value = to_builtins(body)
    if len(value) == 0:
        env.core.settings_delete("pyramid", "metrics")
    else:
        env.core.settings_set("pyramid", "metrics", value)


def settings(request, *, component: str) -> JSONType:
    comp = request.env.components.get(component)
    if comp is None:
        raise ValidationError(message=_("Invalid component identity."))

    return comp.client_settings(request)


def route(request) -> AsJSON[Dict[str, Annotated[List[str], Meta(min_length=1)]]]:
    """Read route metadata"""
    return request.env.pyramid.route_meta


def pkg_version(request) -> AsJSON[Dict[str, str]]:
    """Read packages versions"""
    return {pn: p.version for pn, p in request.env.packages.items()}


class HealthcheckResponse(TypedDict):
    success: bool
    component: Dict[str, Any]


def healthcheck(
    request,
) -> AnyOf[
    Annotated[HealthcheckResponse, StatusCode(200)],
    Annotated[HealthcheckResponse, StatusCode(503)],
]:
    """Run healtchecks and return the result"""
    components = [comp for comp in env.components.values() if hasattr(comp, "healthcheck")]

    result = dict(success=True)
    result["component"] = dict()

    for comp in components:
        cresult = comp.healthcheck()
        result["success"] = result["success"] and cresult["success"]
        result["component"][comp.identity] = cresult

    if not result["success"]:
        request.response.status_code = 503
    return result


def statistics(request) -> JSONType:
    request.require_administrator()

    result = dict()
    for comp in request.env.components.values():
        if hasattr(comp, "query_stat"):
            result[comp.identity] = comp.query_stat()
    return result


def require_storage_enabled(request):
    if not request.env.core.options["storage.enabled"]:
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


CSSGetPutContent = AnyOf[
    Annotated[str, ContentType("application/json")],
    Annotated[str, ContentType("text/css")],
]


def custom_css_get(request, *, ckey: Optional[CKey]) -> CSSGetPutContent:
    """Read custom CSS styles as plain CSS or as JSON string

    :param ckey: Caching key
    :returns: Current custom CSS rules"""
    try:
        body = request.env.core.settings_get("pyramid", "custom_css")
    except KeyError:
        body = ""

    m = request.accept.best_match(("application/json", "text/css"))
    if m == "application/json":
        return body
    elif m == "text/css":
        response = Response(body, content_type="text/css", charset="utf-8")

    if ckey == request.env.core.settings_get("pyramid", "custom_css.ckey"):
        request.response.cache_control.public = True
        request.response.cache_control.max_age = 86400

    return response


def custom_css_put(request, body: CSSGetPutContent) -> AsJSON[CKey]:
    """Update custom CSS styles from plain CSS or JSON string

    :returns: New caching key"""
    request.require_administrator()

    if body is None or re.match(r"^\s*$", body, re.MULTILINE):
        request.env.core.settings_delete("pyramid", "custom_css")
    else:
        request.env.core.settings_set("pyramid", "custom_css", body)

    ckey = gensecret(8)
    request.env.core.settings_set("pyramid", "custom_css.ckey", ckey)
    return ckey


def logo_get(request):
    try:
        logodata = request.env.core.settings_get("pyramid", "logo")
    except KeyError:
        raise HTTPNotFound()

    bindata = base64.b64decode(logodata)
    response = Response(bindata, content_type="image/png")

    if "ckey" in request.GET and request.GET["ckey"] == request.env.core.settings_get(
        "pyramid", "logo.ckey"
    ):
        response.cache_control.public = True
        response.cache_control.max_age = int(timedelta(days=1).total_seconds())

    return response


def logo_put(request):
    request.require_administrator()

    value = request.json_body

    if value is None:
        request.env.core.settings_delete("pyramid", "logo")

    else:
        fn, fnmeta = request.env.file_upload.get_filename(value["id"])
        with open(fn, "rb") as fd:
            data = base64.b64encode(fd.read())
            request.env.core.settings_set("pyramid", "logo", data.decode("utf-8"))

    request.env.core.settings_set("pyramid", "logo.ckey", gensecret(8))

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
        default = request.env.pyramid.resource_path("asset/logo_outline.png")
        response = FileResponse(default)

    if "ckey" in request.GET and request.GET["ckey"] == request.env.core.settings_get(
        "pyramid", "company_logo.ckey"
    ):
        response.cache_control.public = True
        response.cache_control.max_age = int(timedelta(days=1).total_seconds())

    return response


def setup_pyramid(comp, config):
    config.add_request_method(check_origin)

    config.add_tween(
        "nextgisweb.pyramid.api.cors_tween_factory",
        under=("nextgisweb.pyramid.exception.handled_exception_tween_factory", "INGRESS"),
    )

    config.add_route(
        "pyramid.cors",
        "/api/component/pyramid/cors",
        get=cors_get,
        put=cors_put,
    )

    config.add_route(
        "pyramid.system_name",
        "/api/component/pyramid/system_name",
        get=system_name_get,
        put=system_name_put,
    )

    config.add_route(
        "pyramid.settings",
        "/api/component/pyramid/settings",
        get=settings,
    )

    config.add_route(
        "pyramid.route",
        "/api/component/pyramid/route",
        get=route,
    )

    config.add_route(
        "pyramid.pkg_version",
        "/api/component/pyramid/pkg_version",
        get=pkg_version,
    )

    config.add_route(
        "pyramid.healthcheck",
        "/api/component/pyramid/healthcheck",
        get=healthcheck,
    )

    config.add_route(
        "pyramid.statistics",
        "/api/component/pyramid/statistics",
        get=statistics,
    )

    config.add_route(
        "pyramid.estimate_storage",
        "/api/component/pyramid/estimate_storage",
        post=estimate_storage,
    )

    config.add_route(
        "pyramid.storage_status",
        "/api/component/pyramid/storage_status",
        get=storage_status,
    )

    config.add_route(
        "pyramid.storage",
        "/api/component/pyramid/storage",
        get=storage,
    )

    config.add_route(
        "pyramid.kind_of_data",
        "/api/component/pyramid/kind_of_data",
        get=kind_of_data,
    )

    config.add_route(
        "pyramid.custom_css",
        "/api/component/pyramid/custom_css",
        get=custom_css_get,
        put=custom_css_put,
    )

    config.add_route(
        "pyramid.logo",
        "/api/component/pyramid/logo",
        get=logo_get,
        put=logo_put,
    )

    # Methods for customization in components
    comp.company_logo_enabled = lambda request: True
    comp.company_logo_view = None
    comp.company_url_view = lambda request: comp.options["company_url"]

    comp.help_page_url_view = (
        lambda request: comp.options["help_page.url"]
        if comp.options["help_page.enabled"]
        else None
    )

    def preview_link_view(request):
        defaults = comp.preview_link_default_view(request)

        if (
            hasattr(request, "context")
            and isinstance(request.context, Resource)
            and request.context in DBSession
        ):
            if not request.context.has_permission(ResourceScope.read, request.user):
                return dict(image=None, description=None)

            social = request.context.social
            if social is not None:
                image = (
                    request.route_url(
                        "resource.preview",
                        id=request.context.id,
                        _query=str(social.preview_fileobj_id),
                    )
                    if social.preview_fileobj is not None
                    else defaults["image"]
                )
                description = (
                    social.preview_description
                    if social.preview_description is not None
                    else defaults["description"]
                )
                return dict(image=image, description=description)
        return defaults

    comp.preview_link_default_view = lambda request: dict(
        image=request.static_url("asset/pyramid/webgis-for-social.png"),
        description=_("Your Web GIS at nextgis.com"),
    )

    comp.preview_link_view = preview_link_view

    config.add_route(
        "pyramid.company_logo",
        "/api/component/pyramid/company_logo",
        get=company_logo,
    )

    # TODO: Add PUT method for changing custom_css setting and GUI

    config.add_route(
        "pyramid.home_path",
        "/api/component/pyramid/home_path",
        get=home_path_get,
        put=home_path_put,
    )

    config.add_route(
        "pyramid.metrics",
        "/api/component/pyramid/metrics",
        get=metrics_get,
        put=metrics_put,
    )
