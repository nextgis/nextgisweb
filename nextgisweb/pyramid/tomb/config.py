from __future__ import annotations

import re
from collections.abc import Callable, Iterable, Mapping
from functools import wraps
from inspect import signature, unwrap
from sys import _getframe
from types import FunctionType
from typing import TYPE_CHECKING, Annotated, Any, Final, Literal, Self, Unpack

from msgspec import NODEFAULT, Meta
from msgspec import DecodeError as MsgspecDecodeError
from msgspec import ValidationError as MsgSpecValidationError
from msgspec.inspect import IntType, Metadata, type_info
from msgspec.json import Decoder
from pyramid.config import Configurator as PyramidConfigurator
from pyramid.exceptions import ConfigurationError
from pyramid.interfaces import IRoutesMapper
from typing_extensions import TypedDict

from nextgisweb.env import gettext, gettextf
from nextgisweb.env.package import pkginfo
from nextgisweb.lib.apitype import ContentType, EmptyObject, JSONType, PathParam, QueryParam
from nextgisweb.lib.apitype.query_string import QueryParamError, QueryParamRequired
from nextgisweb.lib.apitype.schema import _AnyOfRuntime
from nextgisweb.lib.apitype.util import (
    EmptyInstance,
    EmptyObjectStruct,
    disannotate,
    is_struct_type,
)
from nextgisweb.lib.imptool import module_from_stack, module_path
from nextgisweb.lib.logging import logger

from nextgisweb.core.exception import ValidationError

from .exception import MalformedJSONBody
from .predicate import ErrorRendererPredicate, RequestMethodPredicate, RouteMeta, ViewMeta
from .request import Request
from .response import Response
from .types import ContextFactory, CorsHeaders, RequestMethodType, ViewFunc
from .urldispatch import RoutesMapper
from .util import ContextRequestViewMapper, push_stacklevel


def _json_msgspec_factory(typedef):
    decoder = Decoder(typedef)

    def _json_msgspec(request: Request):
        try:
            return decoder.decode(request.body)
        except MsgSpecValidationError as exc:
            raise ValidationError(message=exc.args[0]) from exc
        except MsgspecDecodeError as exc:
            raise MalformedJSONBody from exc

    return _json_msgspec


def _view_driver_factory(
    view: Callable,
    pass_context: bool,
    *,
    path_params: Mapping[str, PathParam],
    query_params: Mapping[str, QueryParam],
    body: tuple[str, Any] | None,
    result: Any,
) -> Callable[[object, Request], object]:
    # NOTE: Path parameters are decoded twice (the first time in request.path_param) because
    # different constraints may apply: one from the route and another from the view.
    extract = (
        *((arg, _path_extractor(pp.name, pp.decoder)) for arg, pp in path_params.items()),
        *((arg, _query_extractor(qp.decoder)) for arg, qp in query_params.items()),
        *((body,) if body is not None else ()),
    )

    convert = _convert_empty_object if result is EmptyObject else None

    @wraps(view)
    def _view(context: object, request: Request) -> object:
        try:
            kw = {k: f(request) for k, f in extract}
        except QueryParamError as exc:
            raise _describe_query_param_error(exc)
        result = view(context, request, **kw) if pass_context else view(request, **kw)
        return result if convert is None else convert(result)

    return _view


def _path_extractor(name: str, decoder: Callable) -> Callable:
    return lambda req: decoder(req.matchdict[name])


def _query_extractor(decoder: Callable) -> Callable:
    return lambda req: decoder(req.qs_parser)


def _convert_empty_object[T: object](value: T) -> T | EmptyObjectStruct:
    return value if value is not None else EmptyInstance


def _describe_query_param_error(exc):
    name = exc.name
    data = dict(location=["query", exc.name])
    if isinstance(exc, QueryParamRequired):
        title = gettext("Parameter required")
        message = gettextf("The '{}' query parameter is required.")(exc.name)
    else:
        title = gettext("Invalid parameter")
        message = gettextf("The '{}' query parameter has an invalid value.")(name)
    return ValidationError(title=title, message=message, data=data)


def find_template(name, func=None, stack_level=1):
    if func is not None:

        def _traverse():
            f = func
            while f is not None:
                yield f.__module__
                f = getattr(f, "__wrapped__", None)

        modules = _traverse()
    else:
        fr = _getframe(stack_level)
        modules = [fr.f_globals["__name__"]]

    for m in modules:
        parts = m.split(".")
        while parts:
            mod = ".".join(parts)
            comp_id = pkginfo.component_by_module(mod)
            if comp_id:
                fn = module_path(mod) / "template" / name
                if fn.exists():
                    logger.debug(
                        "Template %s found in %s",
                        name,
                        fn,
                    )
                    return str(fn)
            parts.pop(-1)

    raise ValueError(f"Template '{name}' not found")


PATH_TYPE_UNKNOWN = Annotated[str, Meta(description="Undocumented")]
PATH_TYPES = dict[str, Any](
    # Basic types
    str=Annotated[str, Meta(extra=dict(route_pattern=r"[^/]+"))],
    any=Annotated[str, Meta(extra=dict(route_pattern=r".+"))],
    int=Annotated[int, Meta(extra=dict(route_pattern=r"-?[0-9]+"))],
    # Some useful types
    uint=Annotated[int, Meta(ge=0, extra=dict(route_pattern=r"[0-9]+"))],
    pint=Annotated[int, Meta(ge=1, extra=dict(route_pattern=r"0*[1-9][0-9]*"))],
    urlsafe=Annotated[str, Meta(extra=dict(route_pattern=r"[A-Za-z0-9\-\._~]+"))],
)


PATH_PARAM_RE = re.compile(r"\{(?P<k>\w+)(?:\:(?P<r>.+?))?\}")
SUBPATH_RE = re.compile(r"^.*\*\w+$")


class Configurator(PyramidConfigurator):
    if TYPE_CHECKING:
        registry: Any

    def setup_registry(self, *args, **kwargs):
        assert len(args) == 0

        kwargs["request_factory"] = Request
        kwargs["exceptionresponse_view"] = None

        super().setup_registry(**kwargs)

        self.registry.registerUtility(RoutesMapper(), IRoutesMapper)
        self.add_view_deriver(ViewMetaDeriver(), name="view_meta")
        self.set_execution_policy(self._execution_policy)

    def add_default_tweens(self):
        pass  # Skip pyramid.tweens.excview_tween_factory registration

    def add_default_route_predicates(self):
        import pyramid.predicates as pp

        self.add_route_predicate("route_meta", RouteMeta.as_predicate())
        self.add_route_predicate("error_renderer", ErrorRendererPredicate)

        self.add_route_predicate("request_method", RequestMethodPredicate)

        # Default Pyramid predicates, except RequestMethodPredicate
        self.add_route_predicate("xhr", pp.XHRPredicate)
        self.add_route_predicate("path_info", pp.PathInfoPredicate)
        self.add_route_predicate("request_param", pp.RequestParamPredicate)
        self.add_route_predicate("header", pp.HeaderPredicate)
        self.add_route_predicate("accept", pp.AcceptPredicate)
        self.add_route_predicate("is_authenticated", pp.IsAuthenticatedPredicate)
        self.add_route_predicate("effective_principals", pp.EffectivePrincipalsPredicate)
        self.add_route_predicate("custom", pp.CustomPredicate)
        self.add_route_predicate("traverse", pp.TraversePredicate)

    def add_default_view_predicates(self):
        import pyramid.predicates as pp

        self.add_view_predicate("request_method", RequestMethodPredicate)

        # Default Pyramid predicates, except RequestMethodPredicate
        self.add_view_predicate("xhr", pp.XHRPredicate)
        self.add_view_predicate("path_info", pp.PathInfoPredicate)
        self.add_view_predicate("request_param", pp.RequestParamPredicate)
        self.add_view_predicate("header", pp.HeaderPredicate)
        self.add_view_predicate("accept", pp.AcceptPredicate)
        self.add_view_predicate("containment", pp.ContainmentPredicate)
        self.add_view_predicate("request_type", pp.RequestTypePredicate)
        self.add_view_predicate("match_param", pp.MatchParamPredicate)
        self.add_view_predicate("physical_path", pp.PhysicalPathPredicate)
        self.add_view_predicate("is_authenticated", pp.IsAuthenticatedPredicate)
        self.add_view_predicate("effective_principals", pp.EffectivePrincipalsPredicate)
        self.add_view_predicate("custom", pp.CustomPredicate)

    class _AddRouteKW(TypedDict, total=False, closed=True):
        static_source: Literal[True]
        stacklevel: int

    def add_route(
        self,
        name: str,
        pattern: str,
        *,
        types: dict[str, object] | None = None,
        overloaded: bool = False,
        client: bool = True,
        openapi: bool = True,
        deprecated: bool = False,
        factory: ContextFactory | None = None,
        error_renderer: Callable | None = None,
        cors_headers: CorsHeaders | None = None,
        # Method handlers shortcuts
        head: ViewFunc | None = None,
        get: ViewFunc | None = None,
        post: ViewFunc | None = None,
        put: ViewFunc | None = None,
        delete: ViewFunc | None = None,
        options: ViewFunc | None = None,
        patch: ViewFunc | None = None,
        **kw: Unpack[_AddRouteKW],
    ) -> ConfiguratorRouteHelper:
        assert pattern and pattern.startswith("/"), "Route pattern must start with '/'"
        assert SUBPATH_RE.match(pattern) is None, "Route pattern must not contain a subpath"

        kwargs: dict[str, object] = {**kw}

        stacklevel = push_stacklevel(kwargs, False, True)
        component = pkginfo.component_by_module(module_from_stack(stacklevel - 1))
        assert component is not None, "Component could not be determined"

        opattern = pattern
        rtypes: dict[str, object] = {}

        if factory is not None:
            rtypes.update(getattr(factory, "annotations", {}))

        if types is not None:
            rtypes.update(types)

        # Rewrite route pattern in the following formats:
        #   pattern:    /param/{name:regexp}  for Pyramid framework
        #   itemplate:  /param/{0}            with numeric placeholders
        #   ktemplate:  /param/{name}         with string placeholders

        lastpos, pattern, itemplate, ktemplate = 0, "", "", ""
        for idx, m in enumerate(PATH_PARAM_RE.finditer(opattern)):
            leader = opattern[lastpos : m.start()]
            lastpos = m.end()

            key, type_or_regexp = m.groups()

            if (tdef := rtypes.get(key)) is None:
                tdef = PATH_TYPES.get(type_or_regexp, PATH_TYPE_UNKNOWN)
                rtypes[key] = tdef

            if type_or_regexp:
                if pdef := PATH_TYPES.get(type_or_regexp):
                    # ty: ignore[unresolved-attribute]
                    mpattern = type_info(pdef).extra["route_pattern"]
                else:
                    mpattern = type_or_regexp
            else:
                mpattern = self._pattern_from_type(tdef)

            pattern += "%s{%s:%s}" % (leader, key, mpattern)
            itemplate += "%s{%s}" % (leader, str(idx))
            ktemplate += "%s{%s}" % (leader, key)

        trailer = opattern[lastpos:]
        itemplate += trailer
        ktemplate += trailer
        pattern += trailer

        path_params = {k: PathParam(k, v) for k, v in rtypes.items()}
        path_decoders = [(k, v.decoder) for k, v in path_params.items()]

        kwargs["route_meta"] = RouteMeta(
            component=component,
            overloaded=overloaded,
            client=client,
            cors_headers=cors_headers,
            itemplate=itemplate,
            ktemplate=ktemplate,
            path_params=path_params,
            path_decoders=path_decoders,
        )

        helper = ConfiguratorRouteHelper(self, name, deprecated=deprecated, openapi=openapi)
        for m, h in (
            ("HEAD", head),
            ("GET", get),
            ("POST", post),
            ("PUT", put),
            ("DELETE", delete),
            ("OPTIONS", options),
            ("PATCH", patch),
        ):
            if h is not None:
                helper.add_view(h, request_method=m, stacklevel=stacklevel)

        if factory is not None:
            kwargs["factory"] = factory

        if error_renderer is not None:
            kwargs["error_renderer"] = error_renderer

        super().add_route(name, pattern=pattern, **kwargs)

        return helper

    class _AddViewKW(TypedDict, total=False, closed=True):
        react_renderer: str
        stacklevel: int

    def add_view(
        self,
        view: ViewFunc,
        *,
        route_name: str,
        request_method: RequestMethodType | None = None,
        context: object | None = None,
        query_params: Iterable | None = None,
        openapi: bool = True,
        deprecated: bool = False,
        **kw: Unpack[_AddViewKW],
    ):
        assert view is not None, "View function must be provided"
        assert route_name is not None, "Route name must be provided"

        kwargs = {**kw}

        extra_query_params = query_params
        del query_params

        stacklevel = push_stacklevel(kwargs, False, True)
        component = pkginfo.component_by_module(module_from_stack(stacklevel - 1))
        assert component is not None, "Component could not be determined"

        # Extract attrs missing in kwargs from view.__pyramid_{attr}__
        attrs = {"renderer", "query_params", "react_renderer"}.difference(set(kwargs.keys()))

        fn = view
        while fn and len(attrs) > 0:
            for attr in set(attrs):
                if (v := getattr(fn, f"__pyramid_{attr}__", None)) is not None:
                    kwargs[attr] = v
                    attrs.remove(attr)
            fn = getattr(fn, "__wrapped__", None)

        sig = signature(view, eval_str=True)

        body_type = None
        has_request = has_context = False
        path_params: dict[str, PathParam] = {}
        query_params: dict[str, QueryParam] = {}
        body: tuple[str, Any] | None = None

        for idx, (name, p) in enumerate(sig.parameters.items()):
            if name == "request":
                has_request = True
                continue
            elif idx == 0:
                has_context = True
                if p.annotation is not p.empty:
                    kwargs["context"] = p.annotation
                continue

            assert has_request or idx in (0, 1)

            if name in ("body", "json_body"):
                assert body is None, "Got both of body and json_body arguments"
                assert p.annotation is not p.empty, f"Type hint required for {name}"
                body_type = p.annotation
                body_base, body_extras = disannotate(body_type)
                if is_struct_type(body_base) or (ContentType.JSON in body_extras):
                    bextract = _json_msgspec_factory(body_type)
                else:
                    err = f"Body type not supported: {body_base}"
                    raise NotImplementedError(err)
                body = (name, bextract)

            elif p.kind == p.POSITIONAL_OR_KEYWORD:
                assert p.default is p.empty
                assert p.annotation is not p.empty
                path_params[name] = PathParam(name, p.annotation)

            elif p.kind == p.KEYWORD_ONLY:
                pdefault = p.default if p.default is not p.empty else NODEFAULT
                query_params[name] = QueryParam(name, p.annotation, pdefault)

        return_type = sig.return_annotation
        return_renderer = None
        if return_type is sig.empty:
            return_type = None
        elif return_type is JSONType:
            return_renderer = "json"
        else:
            return_concrete, return_extras = disannotate(return_type, supertype=True)
            if (
                return_concrete is EmptyObject
                or is_struct_type(return_concrete)
                or ContentType.JSON in return_extras
                or _AnyOfRuntime in return_extras
            ):
                return_renderer = "msgspec"

        if kwargs.get("renderer") is None and return_renderer is not None:
            kwargs["renderer"] = return_renderer

        kwargs["mapper"] = ContextRequestViewMapper
        view = _view_driver_factory(
            view,
            has_context,
            path_params=path_params,
            query_params=query_params,
            body=body,
            result=return_type,
        )

        if extra_query_params is not None:
            query_params = query_params.copy()
            for eqp in extra_query_params:
                if len(eqp) == 2:
                    eqp = eqp + (NODEFAULT,)
                query_params[eqp[0]] = QueryParam(*eqp)

        react_renderer = kwargs.pop("react_renderer", None)
        assert react_renderer is None or isinstance(react_renderer, str)

        kwargs["view_meta"] = ViewMeta(
            func=view,
            context=context,
            deprecated=deprecated,
            openapi=openapi,
            path_params=path_params,
            query_params=query_params,
            component=component,
            body_type=body_type,
            return_type=return_type,
            react_renderer=react_renderer,
        )

        if route_name is not None:
            kwargs["route_name"] = route_name
        if request_method is not None:
            kwargs["request_method"] = request_method
        if context is not None:
            kwargs["context"] = context

        if (renderer := kwargs.get("renderer")) is not None:
            assert isinstance(renderer, str)
            if renderer == "mako" and isinstance(view, FunctionType):
                renderer = view.__name__ + ".mako"
            if renderer.endswith(".mako") and (":" not in renderer):
                renderer = find_template(renderer, view)
            kwargs["renderer"] = renderer

        super().add_view(view=view, **kwargs)

    def commit(self):
        from .inspect import iter_routes

        super().commit()

        routes = list(iter_routes(self.introspector))
        routes.sort(key=lambda r: r.itemplate)

        logger.info("Validating %d routes", len(routes))
        for route in routes:
            methods = set()
            is_api = route.is_api
            logger.debug("%s (%s)", route.ktemplate, route.name)
            for view in route.views:
                method = view.method
                func = unwrap(view.func)
                logger.debug(
                    "    %-8s %s.%s",
                    method or "any",
                    getattr(func, "__module__", "<unknown>"),
                    getattr(func, "__qualname__", "<unknown>"),
                )
                if not isinstance(view.method, str):
                    raise ConfigurationError(
                        f"View {view.func} for route '{route.name}' must have"
                        f"a request method specified."
                    )

                if is_api and not route.overloaded and view.method in methods:
                    raise ConfigurationError(
                        f"Route '{route.name}' appears to be overloaded and "
                        "requires the overloaded=True predicate."
                    )

                methods.add(view.method)

    def _pattern_from_type(self, tdef):
        tinfo = type_info(tdef)
        titype = tinfo.type if isinstance(tinfo, Metadata) else tinfo
        if (
            isinstance(tinfo, Metadata)
            and tinfo.extra
            and (extra_pattern := tinfo.extra["route_pattern"])
        ):
            return extra_pattern
        elif isinstance(titype, IntType):
            if (titype.ge is not None and titype.ge >= 1) or (
                titype.gt is not None and titype.gt >= 0
            ):
                return r"0*[1-9][0-9]*"
            elif (titype.ge is not None and titype.ge >= 0) or (
                titype.gt is not None and titype.gt >= -1
            ):
                return r"0*[1-9][0-9]*|0+"
            else:
                return r"-?0*[1-9][0-9]*|0+"
        else:
            raise ValueError("Type or pattern required")

    def _execution_policy(self, environ, router):
        with router.request_context(environ) as request:
            try:
                getattr(request, "path_info")
            except UnicodeDecodeError:
                return Response(
                    status=400,
                    content_type="text/plain",
                    body="Malformed request URI\n",
                )
            return router.invoke_request(request)


class ConfiguratorRouteHelper:
    def __init__(self, config: Configurator, name: str, *, deprecated: bool, openapi: bool):
        self.name: Final = name
        self.config: Final = config
        self.deprecated: Final = deprecated
        self.openapi: Final = openapi

    class _AddViewKW(TypedDict, total=False, closed=True):
        route_name: str
        request_method: RequestMethodType
        openapi: bool
        deprecated: bool
        context: object
        stacklevel: int

    def add_view(self, view: ViewFunc, /, **kwargs: Unpack[_AddViewKW]) -> Self:
        push_stacklevel(kwargs, True)

        if "route_name" not in kwargs:
            kwargs["route_name"] = self.name

        kwargs.setdefault("openapi", self.openapi)
        kwargs.setdefault("deprecated", self.deprecated)

        self.config.add_view(view=view, **kwargs)

        return self

    class _AddMethodKW(TypedDict, total=False, closed=True):
        route_name: str
        openapi: bool
        deprecated: bool
        context: object

    def head(self, view: ViewFunc, /, **kwargs: Unpack[_AddMethodKW]) -> Self:
        push_stacklevel(kwargs, True)
        return self.add_view(view, request_method="HEAD", **kwargs)

    def get(self, view: ViewFunc, /, **kwargs: Unpack[_AddMethodKW]) -> Self:
        push_stacklevel(kwargs, True)
        return self.add_view(view, request_method="GET", **kwargs)

    def post(self, view: ViewFunc, /, **kwargs: Unpack[_AddMethodKW]) -> Self:
        push_stacklevel(kwargs, True)
        return self.add_view(view, request_method="POST", **kwargs)

    def put(self, view: ViewFunc, /, **kwargs: Unpack[_AddMethodKW]) -> Self:
        push_stacklevel(kwargs, True)
        return self.add_view(view, request_method="PUT", **kwargs)

    def delete(self, view: ViewFunc, /, **kwargs: Unpack[_AddMethodKW]) -> Self:
        push_stacklevel(kwargs, True)
        return self.add_view(view, request_method="DELETE", **kwargs)

    def options(self, view: ViewFunc, /, **kwargs: Unpack[_AddMethodKW]) -> Self:
        push_stacklevel(kwargs, True)
        return self.add_view(view, request_method="OPTIONS", **kwargs)

    def patch(self, view: ViewFunc, /, **kwargs: Unpack[_AddMethodKW]) -> Self:
        push_stacklevel(kwargs, True)
        return self.add_view(view, request_method="PATCH", **kwargs)


class ViewMetaDeriver:
    """Dummy view meta deriver which registers `view_meta` option for views."""

    options = ("view_meta",)

    def __call__(self, view, info):
        return view
