import sys
from typing import Annotated, Any, Protocol, Self

import pyramid.httpexceptions as httpexceptions
from msgspec import UNSET, Struct, UnsetType
from msgspec import DecodeError as MsgspecDecodeError
from pyramid.renderers import render_to_response
from pyramid.request import RequestLocalCache
from pyramid.response import Response

from nextgisweb.env import gettext, inject
from nextgisweb.lib import json
from nextgisweb.lib.i18n.trstr import TrStr
from nextgisweb.lib.logging import logger

from nextgisweb.core.exception import UserException, UserExceptionContact
from nextgisweb.gui import REACT_RENDERER
from nextgisweb.jsrealm import TSExport, jsentry

from .tomb import Request
from .tomb.exception import MalformedJSONBody
from .tomb.predicate import ErrorRendererPredicate

JSENTRY = jsentry("@nextgisweb/pyramid/error-page")


def includeme(config):
    DB_TFACTORY = "nextgisweb.pyramid.db.tween_factory"

    ERR_TFACTORY = "nextgisweb.pyramid.exception.handled_exception_tween_factory"
    EXC_TFACTORY = "nextgisweb.pyramid.exception.unhandled_exception_tween_factory"

    config.add_tween(ERR_TFACTORY, over=(DB_TFACTORY, "MAIN"), under=("INGRESS",))
    config.add_tween(EXC_TFACTORY, over=(ERR_TFACTORY,))

    # PYRAMID REDEFINED METHODS FOR ERROR HANDLING / CACHING
    @RequestLocalCache()
    def json_body(req):
        try:
            return json.loadb(req.body)
        except MsgspecDecodeError as exc:
            raise MalformedJSONBody from exc

    config.add_request_method(json_body, "json_body", property=True)
    config.add_request_method(json_body, "json", property=True)


class ErrorHandler(Protocol):
    def __call__(self, *, exc: UserException, request: Request) -> Response | None: ...


tests_raise: bool | None = None  # For tests
tests_urls: tuple[str, ...] = ("/test/request", "/api/test/request")


def is_tests_raise(request: Request) -> bool:
    return tests_raise is True or (tests_raise is None and request.path_info in tests_urls)


@inject()
def handled_exception_tween_factory(
    handler,
    registry,
    *,
    err_response: ErrorHandler = inject.arg(),
):

    def handled_exception_tween(request: Request):
        try:
            return handler(request)
        except (httpexceptions.HTTPSuccessful, httpexceptions.HTTPRedirection) as exc:
            return exc
        except (UserException, httpexceptions.HTTPError) as exc:
            if is_tests_raise(request):
                raise

            if isinstance(exc, httpexceptions.HTTPError):
                exc = PyramidHTTPError(exc)

            response = err_response(exc=exc, request=request)
            if response is not None:
                return response

            raise

    return handled_exception_tween


@inject()
def unhandled_exception_tween_factory(
    handler,
    registry,
    *,
    exc_response: ErrorHandler = inject.arg(),
):
    def unhandled_exception_tween(request: Request):
        try:
            return handler(request)
        except Exception as exc:
            if is_tests_raise(request):
                raise

            try:
                logger.exception(
                    "Exception %s while processing request %s (%s %s)",
                    exc.__class__.__qualname__,
                    request.request_id,
                    request.method,
                    request.url,
                )
                iexc = InternalServerError(sys.exc_info())
                return exc_response(exc=iexc, request=request)
            except Exception:
                logger.exception(
                    "Exception %s while rendering error %s (%s %s)",
                    exc_qualname(exc),
                    request.request_id,
                    request.method,
                    request.url,
                )
                return httpexceptions.HTTPInternalServerError()

    return unhandled_exception_tween


def exc_qualname(exc):
    cls = exc.__class__
    module = cls.__module__
    name = getattr(cls, "__qualname__", None)
    if name is None:
        name = cls.__name__
    if module == "exceptions" or module == "builtins":
        return name
    return "%s.%s" % (module, name)


ErrorContact = Annotated[UserExceptionContact, TSExport("ErrorContact")]


class ErrorResponse(Struct, kw_only=True):
    title: str
    message: str | UnsetType
    detail: str | UnsetType
    contact: ErrorContact
    status_code: int
    exception: str
    request_id: str
    data: dict[str, Any]

    @classmethod
    def from_exception(cls, exc: UserException, *, request: Request) -> Self:
        tr = request.translate
        return cls(
            title=tr(exc.title),
            message=tr(v) if (v := exc.message) else UNSET,
            detail=tr(v) if (v := exc.detail) else UNSET,
            contact=exc.contact,
            status_code=exc.http_status_code,
            exception=exc_qualname(exc),
            request_id=request.request_id,
            data=exc.data,
        )


def json_error_response(*, exc: UserException, request: Request, **kwargs) -> Response:
    err_data = ErrorResponse.from_exception(exc, request=request)
    response = render_to_response("json", err_data, request=request)
    response.status_code = err_data.status_code
    return response


def html_error_response(*, exc: UserException, request: Request, **kwargs) -> Response:
    err_data = ErrorResponse.from_exception(exc, request=request)
    response = render_to_response(
        REACT_RENDERER,
        dict(
            entrypoint=JSENTRY,
            props=dict(error_json=err_data),
            layout_mode="headerOnly",
            title=err_data.title,
            adaptive=True,
        ),
        request=request,
    )

    response.status = err_data.status_code
    return response


def predicate_error_handler(*, exc: UserException, request: Request) -> Response | None:
    if (mroute := request.matched_route) is not None:
        for predicate in mroute.predicates:
            if isinstance(predicate, ErrorRendererPredicate):
                error_renderer = predicate.val
                return error_renderer(exc=exc, request=request)


def default_error_handler(*, exc: UserException, request: Request) -> Response:
    if request.is_api or request.is_xhr:
        return json_error_response(exc=exc, request=request)

    return html_error_response(exc=exc, request=request)


class InternalServerError(UserException):
    title = gettext("Internal server error")
    message = gettext(
        "The server encountered an internal error or misconfiguration "
        "and was unable to complete your request."
    )
    http_status_code = 500

    def __init__(self, exc_info):
        super().__init__()
        self.exc_info = exc_info


class PyramidHTTPError(UserException):
    _tm_data: tuple[tuple[type[httpexceptions.HTTPError], TrStr, TrStr], ...] = (
        (
            httpexceptions.HTTPInternalServerError,
            InternalServerError.title,
            InternalServerError.message,
        ),
        (
            httpexceptions.HTTPBadRequest,
            gettext("Bad request"),
            gettext(
                "The server could not comply with the request since it is "
                "either malformed or otherwise incorrect."
            ),
        ),
        (
            httpexceptions.HTTPPaymentRequired,
            gettext("Payment required"),
            gettext("Access was denied for financial reasons."),
        ),
        (
            httpexceptions.HTTPForbidden,
            gettext("Forbidden"),
            gettext("Access was denied to this resource."),
        ),
        (
            httpexceptions.HTTPNotFound,
            gettext("Page not found"),
            gettext(
                "The page may have been deleted or an error in the address. "
                "Correct the address or go to the home page and try to find "
                "the desired page."
            ),
        ),
        (
            httpexceptions.HTTPUnprocessableEntity,
            gettext("Unprocessable entity"),
            gettext("Unable to process the contained instructions."),
        ),
        (
            httpexceptions.HTTPNotImplemented,
            gettext("Not implemented"),
            gettext("Not implemented"),
        ),
        (
            httpexceptions.HTTPServiceUnavailable,
            gettext("Service unavailable"),
            gettext("The server is currently unavailable. Please try again at a later time."),
        ),
    )

    def __init__(self, exc: httpexceptions.HTTPError):
        for cls, title, message in self._tm_data:
            if isinstance(exc, cls):
                break
        else:
            title = exc.title
            message = exc.detail or exc.title

        super().__init__(title=title, message=message, http_status_code=exc.code)
