import sys
from typing import Annotated, Any, Self

import pyramid.httpexceptions as httpexceptions
from msgspec import UNSET, Struct, UnsetType
from msgspec import DecodeError as MsgspecDecodeError
from pyramid.renderers import render_to_response
from pyramid.request import RequestLocalCache

from nextgisweb.env import gettext
from nextgisweb.lib import json
from nextgisweb.lib.i18n.trstr import TrStr
from nextgisweb.lib.logging import logger

from nextgisweb.core.exception import UserException, UserExceptionContact
from nextgisweb.gui import REACT_RENDERER
from nextgisweb.jsrealm import TSExport, jsentry

from .tomb.exception import MalformedJSONBody

JSENTRY = jsentry("@nextgisweb/pyramid/error-page")


def includeme(config):
    TM_TFACTORY = "pyramid_tm.tm_tween_factory"

    ERR_TFACTORY = "nextgisweb.pyramid.exception.handled_exception_tween_factory"
    EXC_TFACTORY = "nextgisweb.pyramid.exception.unhandled_exception_tween_factory"

    config.add_tween(ERR_TFACTORY, over=(TM_TFACTORY, "MAIN"), under=("INGRESS",))
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


def handled_exception_tween_factory(handler, registry):
    err_response = registry.settings["error.err_response"]

    def handled_exception_tween(request):
        try:
            response = handler(request)

            if isinstance(response, httpexceptions.HTTPError):
                raise PyramidHTTPError(response)

            return response

        except UserException as exc:
            if request.path_info.startswith("/test/request/"):
                raise

            eresp = err_response(request, exc, exc, sys.exc_info())
            if eresp is not None:
                return eresp

            raise

    return handled_exception_tween


def unhandled_exception_tween_factory(handler, registry):
    exc_response = registry.settings["error.exc_response"]

    def unhandled_exception_tween(request):
        try:
            return handler(request)
        except Exception as exc:
            if request.path_info.startswith("/test/request/"):
                raise

            if (env := getattr(request, "env", None)) and env.running_tests:
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
                return exc_response(request, iexc, iexc, iexc.exc_info)
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
    def from_exception(cls, exc: UserException, *, request) -> Self:
        tr = request.localizer.translate
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


def json_error_response(request, err_info, exc, exc_info, debug=True):
    err_data = ErrorResponse.from_exception(exc, request=request)
    response = render_to_response("json", err_data, request=request)
    response.status_code = err_data.status_code
    return response


def html_error_response(request, err_info, exc, exc_info, debug=True):
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
