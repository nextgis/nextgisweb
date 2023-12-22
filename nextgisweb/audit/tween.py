from datetime import datetime

from zope.event import notify

from nextgisweb.env import inject

from .component import AuditComponent


class OnResponse:
    def __init__(self, request, response, body):
        self._request = request
        self._response = response
        self._body = body

    @property
    def request(self):
        return self._request

    @property
    def response(self):
        return self._response

    @property
    def body(self):
        return self._body


@inject()
def factory(handler, registry, *, comp: AuditComponent):
    fopts = comp.options.with_prefix("filter")
    filters = [
        lambda req: not req.path_info.startswith(
            (
                "/static/",
                "/_debug_toolbar/",
                "/favicon.ico",
            )
        )
    ]

    if (f_request_method := fopts["request_method"]) is not None:
        f_request_method = tuple(f_request_method)
        filters.append(lambda req: req.method in f_request_method)

    if (f_request_path := fopts["request_path"]) is not None:
        f_request_path = tuple(f_request_path)
        filters.append(lambda req: req.path_info.startswith(f_request_path))

    def tween(request):
        for f in filters:
            if not f(request):
                return handler(request)

        ctx = []
        try:
            for backend in comp.backends.values():
                cman = backend(request)
                ctx.append((cman, cman.__enter__()))

            response = handler(request)
            timestamp = datetime.utcnow()

            body = dict()

            body_request = body["request"] = dict(
                method=request.method,
                path=request.path,
                remote_addr=request.client_addr,
            )

            qstring = request.query_string
            if qstring != "":
                body_request["query_string"] = qstring

            user = request.environ.get("auth.user")
            if user is not None:
                body["user"] = dict(
                    id=user["id"],
                    keyname=user["keyname"],
                    display_name=user["display_name"],
                )

            body_response = body["response"] = dict(status_code=response.status_code)

            if request.matched_route is not None:
                body_response["route_name"] = request.matched_route.name

            context = request.environ.get("audit.context")
            if context is not None:
                body["context"] = dict(zip(("model", "id"), context))

            event = OnResponse(request, response, body)
            notify(event)

            for cman, callback in ctx:
                callback(timestamp, body)

            return response

        finally:
            for cman, _ in ctx:
                cman.__exit__(None, None, None)

    return tween
