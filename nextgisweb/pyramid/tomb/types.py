from typing import Any, Callable, Concatenate, Literal, ParamSpec, Protocol, get_args

from typing_extensions import TypedDict

from .request import Request

RequestMethodType = Literal["HEAD", "GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"]
RequestMethodValues: tuple[RequestMethodType, ...] = get_args(RequestMethodType)


P = ParamSpec("P")
ViewFuncReqOnly = Callable[Concatenate[Request, P], Any]
ViewFuncCtxReq = Callable[Concatenate[Any, Request, P], Any]
ViewFunc = ViewFuncReqOnly | ViewFuncCtxReq


class ContextFactory(Protocol):
    def __call__[C](self, request: Request[C]) -> C: ...


class CorsHeaders(TypedDict, total=False, closed=True):
    request: tuple[str, ...]
    response: tuple[str, ...]
