from __future__ import annotations

from collections.abc import Mapping
from contextlib import contextmanager
from typing import Any, Literal, TypedDict, overload
from urllib.parse import quote
from warnings import warn

import pytest
from requests import Session as RequestsSession
from typing_extensions import Self, Unpack, deprecated
from webtest import TestApp as BaseTestApp
from webtest import TestResponse
from webtest.http import StopableWSGIServer

from nextgisweb.lib.json import dumps


class WSGITestHelper:
    def __init__(self, environment, application):
        self.environment = environment
        self.application = application
        self._http_server = None

    def webtest_app(self):
        return WebTestApp(self.application)

    def httptest_app(self):
        return HTTPTestApp(self.http_server)

    def __enter__(self):
        return self

    def __exit__(self, *args):
        if self.http_server is not None:
            self._http_server.shutdown()
            self._http_server = None

    @property
    def http_server(self):
        if self._http_server is None:
            self._http_server = StopableWSGIServer.create(
                self.application,
                clear_untrusted_proxy_headers=True,
            )
        return self._http_server


class HTTPTestApp(RequestsSession):
    def __init__(self, http_server):
        super().__init__()
        self.http_server = http_server
        self.application_url = http_server.application_url

    @property
    def base_url(self):
        return self.application_url.strip("/")

    def request(self, method, url, *args, **kwargs):
        if url.startswith("/"):
            url = self.application_url.strip("/") + url

        return super().request(method, url, *args, **kwargs)


class WebTestApp(BaseTestApp):
    prefix: str = ""

    Url = str | int
    Status = int | tuple[int, ...] | list[int] | Literal["*"] | None

    class KW(TypedDict, total=False):
        query: Mapping[str, Any] | str
        headers: Mapping[str, str]

    class KWStatus(KW, total=False):
        status: WebTestApp.Status

    class KWBody(KW, total=False):
        data: Any
        json: Any

    class KWBodyStatus(KWBody, total=False):
        status: WebTestApp.Status

    # GET

    @overload
    def get(self, url: Url = "", **kw: Unpack[KWStatus]) -> TestResponse: ...

    @overload
    @deprecated("Only one positional argument 'url' is allowed.")
    def get(self, url: Url, params, /, **kw: Unpack[KWStatus]) -> TestResponse: ...

    @overload
    @deprecated("Use 'query' or 'data' keyword argument instead of 'params'.")
    def get(self, url: Url, *, params, **kw: Unpack[KWStatus]) -> TestResponse: ...

    # HEAD

    @overload
    def head(self, url: Url = "", **kw: Unpack[KWStatus]) -> TestResponse: ...

    @overload
    @deprecated("Only one positional argument 'url' is allowed.")
    def head(self, url: Url, params, /, **kw: Unpack[KWStatus]) -> TestResponse: ...

    @overload
    @deprecated("Use 'query' or 'data' keyword argument instead of 'params'.")
    def head(self, url: Url, *, params, **kw: Unpack[KWStatus]) -> TestResponse: ...

    # OPTIONS

    @overload
    def options(self, url: Url = "", **kw: Unpack[KWStatus]) -> TestResponse: ...

    @overload
    @deprecated("Only one positional argument 'url' is allowed.")
    def options(self, url: Url, params, /, **kw: Unpack[KWStatus]) -> TestResponse: ...

    @overload
    @deprecated("Use 'query' or 'data' keyword argument instead of 'params'.")
    def options(self, url: Url, *, params, **kw: Unpack[KWStatus]) -> TestResponse: ...

    # POST

    @overload
    def post(self, url: Url = "", **kw: Unpack[KWBodyStatus]) -> TestResponse: ...

    @overload
    @deprecated("Only one positional argument 'url' is allowed.")
    def post(self, url: Url, params, /, **kw: Unpack[KWBodyStatus]) -> TestResponse: ...

    @overload
    @deprecated("Use 'query' or 'data' keyword argument instead of 'params'.")
    def post(self, url: Url, *, params, **kw: Unpack[KWBodyStatus]) -> TestResponse: ...

    @deprecated("Use 'post' method with 'json' keyword argument instead.")
    def post_json(self, *args, **kw) -> TestResponse:
        return super().post_json(*args, **kw)

    # PUT

    @overload
    def put(self, url: Url = "", **kw: Unpack[KWBodyStatus]) -> TestResponse: ...

    @overload
    @deprecated("Only one positional argument 'url' is allowed.")
    def put(self, url: Url, params, /, **kw: Unpack[KWBodyStatus]) -> TestResponse: ...

    @overload
    @deprecated("Use 'query' or 'data' keyword argument instead of 'params'.")
    def put(self, url: Url, *, params, **kw: Unpack[KWBodyStatus]) -> TestResponse: ...

    @deprecated("Use 'put' method with 'json' keyword argument instead.")
    def put_json(self, *args, **kw) -> TestResponse:
        return super().put_json(*args, **kw)

    # PATCH

    @overload
    def patch(self, url: Url = "", **kw: Unpack[KWBodyStatus]) -> TestResponse: ...

    @overload
    @deprecated("Only one positional argument 'url' is allowed.")
    def patch(self, url: Url, params, /, **kw: Unpack[KWBodyStatus]) -> TestResponse: ...

    @overload
    @deprecated("Use 'query' or 'data' keyword argument instead of 'params'.")
    def patch(self, url: Url, *, params, **kw: Unpack[KWBodyStatus]) -> TestResponse: ...

    @deprecated("Use 'patch' method with 'json' keyword argument instead.")
    def patch_json(self, *args, **kw) -> TestResponse:
        return super().patch_json(*args, **kw)

    # DELETE

    @overload
    def delete(self, url: Url = "", **kw: Unpack[KWBodyStatus]) -> TestResponse: ...

    @overload
    @deprecated("Only one positional argument 'url' is allowed.")
    def delete(self, url: Url, params, /, **kw: Unpack[KWBodyStatus]) -> TestResponse: ...

    @overload
    @deprecated("Use 'query' or 'data' keyword argument instead of 'params'.")
    def delete(self, url: Url, *, params, **kw: Unpack[KWBodyStatus]) -> TestResponse: ...

    @deprecated("Use 'delete' method with 'json' keyword argument instead.")
    def delete_json(self, *args, **kw) -> TestResponse:
        return super().delete_json(*args, **kw)

    # Implementation

    def with_url(self, url: str) -> Self:
        clone = object.__new__(self.__class__)
        clone.__dict__.update(self.__dict__)
        clone.prefix = url if url.startswith("/") else self._url_with_prefix(url)
        return clone

    def get(self, url: Url = "", *args, **kw) -> TestResponse:
        return self._meth("get", url, *args, **kw)

    def head(self, url: Url = "", *args, **kw) -> TestResponse:
        return self._meth("head", url, *args, **kw)

    def options(self, url: Url = "", *args, **kw) -> TestResponse:
        return self._meth("options", url, *args, **kw)

    def post(self, url: Url = "", *args, **kw) -> TestResponse:
        return self._meth("post", url, *args, **kw)

    def put(self, url: Url = "", *args, **kw) -> TestResponse:
        return self._meth("put", url, *args, **kw)

    def patch(self, url: Url = "", *args, **kw) -> TestResponse:
        return self._meth("patch", url, *args, **kw)

    def delete(self, url: Url = "", *args, **kw) -> TestResponse:
        return self._meth("delete", url, *args, **kw)

    # Helpers

    def _meth(self, name: str, url: Url = "", *args, **kw) -> TestResponse:
        self._check_args(args, kw)
        url = self._url_with_prefix(url)
        url = self._query_to_url(url, kw)
        if name not in ("get", "head", "options"):
            self._normalize_body(kw)
        return getattr(super(), name)(url, *args, **kw)

    @classmethod
    def _check_args(cls, args: tuple, kw: dict):
        if len(args) > 1:
            raise TypeError("Too many positional arguments")
        elif len(args) == 1:
            warn(
                "Positional arguments other than 'url' are deprecated",
                DeprecationWarning,
                stacklevel=4,
            )
        if "params" in kw:
            warn(
                "Using 'params' argument is deprecated, use 'query' or 'data' instead.",
                DeprecationWarning,
                stacklevel=4,
            )

    def _url_with_prefix(self, url: Url) -> str:
        if not isinstance(url, str):
            url = str(url)
        if not self.prefix:
            return url
        if not url:
            return self.prefix
        return self.prefix.rstrip("/") + "/" + url.lstrip("/")

    @classmethod
    def _query_to_url(cls, url: str, kw: dict) -> str:
        if not (query := kw.pop("query", None)):
            return url
        qs = cls._encode_query(query)
        return f"{url}?{qs}" if "?" not in url else f"{url}&{qs}"

    @classmethod
    def _normalize_body(cls, kw: dict):
        has_data = "data" in kw
        has_json = "json" in kw
        if has_data and has_json:
            raise ValueError("Cannot use both 'data' and 'json' arguments")
        elif has_data:
            payload = kw.pop("data")
            kw.update(params=payload)
        elif has_json:
            payload = kw.pop("json")
            kw.setdefault("headers", {})["Content-Type"] = "application/json"
            kw.update(params=dumps(payload))

    @classmethod
    def _encode_query(cls, value: Mapping[str, Any] | str) -> str | None:
        if isinstance(value, str):
            return value
        parts: list[tuple[str, str]] = []
        for k, v in value.items():
            if isinstance(v, (list, tuple)):
                v = ",".join(cls._encode_scalar(i) for i in v)
            else:
                v = cls._encode_scalar(v)
            parts.append((quote(k), v))
        return "&".join(f"{k}={v}" for k, v in parts)

    @classmethod
    def _encode_scalar(cls, value: Any) -> str:
        if isinstance(value, str):
            return quote(value)
        if isinstance(value, bool):
            return "true" if value else "false"
        if isinstance(value, (int, float)):
            return str(value)
        raise NotImplementedError(f"Unsupported type: {type(value).__name__}")
