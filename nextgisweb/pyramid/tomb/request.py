from collections.abc import Callable, Mapping
from functools import cached_property
from secrets import token_hex
from typing import TYPE_CHECKING, Any, overload

from pyramid.request import Request as BaseRequest

from nextgisweb.env import Env
from nextgisweb.lib.apitype import QueryString

from nextgisweb.i18n import Localizer


class Request[C](BaseRequest):
    @cached_property
    def env(self) -> Env:
        return self.registry.settings["pyramid.env"]

    @cached_property
    def request_id(self) -> str:
        return token_hex(8)

    @cached_property
    def is_api(self) -> bool:
        return self.path_info.lower().startswith("/api/")

    @cached_property
    def qs_parser(self) -> QueryString:
        return QueryString(self.environ["QUERY_STRING"])

    @cached_property
    def path_param(self) -> Mapping[str, Any]:
        rmeta = self.matched_route.meta
        assert rmeta is not None

        mdict = self.matchdict
        return {name: decoder(mdict[name]) for name, decoder in rmeta.path_decoders}

    @cached_property
    def localizer(self) -> Localizer:
        return self.registry.settings["pyramid.localizer"](self.locale_name)

    @cached_property
    def translate(self) -> Callable[[Any], str]:
        return self.localizer.translate

    if TYPE_CHECKING:
        from nextgisweb.auth import User

        from .response import Response
        from .types import RequestMethodType
        from .urldispatch import Route

        @property
        def context(self) -> C: ...

        @property
        def locale_name(self) -> str: ...

        @property
        def user(self) -> User: ...

        def require_administrator(self) -> None: ...

        def require_authenticated(self) -> None: ...

        @overload
        def resource_permission(self, permission) -> None: ...

        @overload
        def resource_permission(self, permission, resource) -> None: ...

        def check_origin(self, origin: str) -> bool: ...

        def audit_context(self, model: str, id: int) -> None: ...

        # Pyramid stuff

        @property
        def response(self) -> Response: ...

        @property
        def registry(self) -> Any: ...

        @property
        def environ(self) -> dict[str, Any]: ...

        @property
        def authenticated_userid(self) -> int | None: ...

        @property
        def method(self) -> RequestMethodType: ...

        @property
        def url(self) -> str: ...

        @property
        def path_info(self) -> str: ...

        @property
        def matched_route(self) -> Route: ...

        @property
        def matchdict(self) -> Mapping[str, str]: ...

        @property
        def query_string(self) -> str: ...

        @property
        def params(self) -> Mapping[str, str]: ...

        @property
        def GET(self) -> Mapping[str, str]: ...

        @property
        def POST(self) -> Mapping[str, str]: ...

        def route_url(self, route_name: str, *elements, **kw) -> str: ...

        def route_path(self, route_name: str, *elements, **kw) -> str: ...

        def add_response_callback(self, callback) -> None: ...
