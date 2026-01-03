from pyramid.interfaces import IRoutesMapper
from pyramid.response import Response

from .tomb.predicate import RouteMeta
from .util import parse_origin


def check_origin(request, origin: str) -> bool:
    try:
        olist = request.env.core.settings_get("pyramid", "cors_allow_origin")
    except KeyError:
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


def tween_factory(handler, registry):
    """Tween adds Access-Control-* headers for simple and preflighted
    CORS requests"""

    def cors_tween(request):
        if (
            request.path_info.startswith("/api/")
            and (origin := request.headers.get("Origin")) is not None
            and request.check_origin(origin)
        ):
            cors_headerlist = [
                ("Access-Control-Allow-Origin", origin),
                ("Access-Control-Allow-Credentials", "true"),
            ]

            if (
                (route := registry.getUtility(IRoutesMapper)(request)["route"])
                and (meta := RouteMeta.select(route.predicates))
                and (ch := meta.cors_headers)
            ):
                route_cors_headers = ch
            else:
                route_cors_headers = dict()

            # Preflighted request handling

            if request.method == "OPTIONS" and (
                method := request.headers.get("Access-Control-Request-Method")
            ):
                response = Response(content_type="text/plain")

                cors_headerlist.append(("Access-Control-Allow-Methods", method))

                # Authorization + CORS-safeist headers are allowed by default,
                # additional route-specific headers may be extracted from route
                # metadata.

                allowed_headers = {
                    "Authorization",
                    "Accept",
                    "Accept-Language",
                    "Content-Language",
                    "Content-Type",
                    "Range",
                }
                if req_ch := route_cors_headers.get("request"):
                    allowed_headers.update(req_ch)

                cors_headerlist.append(
                    ("Access-Control-Allow-Headers", ", ".join(allowed_headers))
                )
                response.headerlist.extend(cors_headerlist)

                return response

            else:
                if resp_ch := route_cors_headers.get("response"):
                    cors_headerlist.append(("Access-Control-Expose-Headers", ", ".join(resp_ch)))

                @request.add_response_callback
                def _set_response_cors_headers(request, response):
                    response.headerlist.extend(cors_headerlist)

        # Run default request handler
        return handler(request)

    return cors_tween


def includeme(config):
    config.add_request_method(check_origin)
    config.add_tween(
        f"{__name__}.{tween_factory.__name__}",
        under=("nextgisweb.pyramid.exception.handled_exception_tween_factory", "INGRESS"),
    )
