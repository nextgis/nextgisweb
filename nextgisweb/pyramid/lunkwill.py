from urllib.parse import urlunparse

import urllib3
from pyramid.httpexceptions import HTTPBadRequest
from pyramid.response import Response

from nextgisweb.env import gettext, inject

from nextgisweb.core.exception import NotConfigured

from .component import PyramidComponent


class LunkwillNotConfigured(NotConfigured):
    title = gettext("Lunkwill not enabled")
    message = gettext("The Lunkwill extension is not configured on this server.")


class LunkwillIntercepionExpected(NotConfigured):
    title = gettext("Interception expected")
    message = gettext("The Lunkwill extension expects external request interception.")


@inject()
def ensure_interception(*, comp: PyramidComponent):
    if not comp.options["lunkwill.enabled"]:
        raise LunkwillNotConfigured
    if not comp.options["lunkwill.proxy"]:
        raise LunkwillIntercepionExpected


def setup_pyramid(comp, config):
    config.add_route(
        "lunkwill.summary",
        "/api/lunkwill/{id:str}/summary",
        get=proxy,
    )

    config.add_route(
        "lunkwill.response",
        "/api/lunkwill/{id:str}/response",
        get=proxy,
    )

    config.add_route(
        "lunkwill.hmux",
        "/api/lunkwill/hmux",
        get=hmux,
    )

    opts = comp.options.with_prefix("lunkwill")

    if opts["enabled"] and opts["proxy"]:
        st = config.registry.settings

        def lunkwill_url(*, host=opts["host"], path, query):
            return urlunparse(
                ("http", "{}:{}".format(host, opts["port"]), path, None, query, None)
            )

        st["lunkwill.url"] = lunkwill_url
        st["lunkwill.pool"] = urllib3.PoolManager()

        def lunkwill(request):
            v = request.headers.get("X-Lunkwill")
            if v is not None:
                v = v.lower()
                if v not in ("suggest", "require"):
                    raise HTTPBadRequest(explanation="Invalid X-Lunkwill header")
                return v
            return None

        config.add_request_method(lunkwill, reify=True)

        config.add_tween(
            "nextgisweb.pyramid.lunkwill.tween_factory",
            under=["nextgisweb.pyramid.api_cors.tween_factory"],
        )


def tween_factory(handler, registry):
    pool = registry.settings["lunkwill.pool"]
    headers_rm = {h.lower() for h in ("X-Lunkwill",)}

    def tween(request):
        if request.lunkwill is not None:
            url = request.registry.settings["lunkwill.url"](
                path=request.path, query=request.query_string
            )
            headers = {k: v for k, v in request.headers.items() if k.lower() not in headers_rm}
            resp = pool.request(
                request.method,
                url,
                headers=headers,
                body=request.body_file,
                retries=False,
            )
            body = resp.data
            return Response(body=body, status=resp.status, headerlist=resp.headers.items())

        return handler(request)

    return tween


def proxy(request):
    ensure_interception()

    url = request.registry.settings["lunkwill.url"](path=request.path, query=request.query_string)
    headers = {k: v for k, v in request.headers.items() if k.lower() not in ("connection",)}
    headers["Connection"] = "close"
    pool = request.registry.settings["lunkwill.pool"]
    resp = pool.request(request.method, url, headers=headers, retries=False, preload_content=False)
    return Response(status=resp.status, headerlist=resp.headers.items(), app_iter=resp.stream())


def hmux(request):
    ensure_interception()
    assert False, "Unreachable"
