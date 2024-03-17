import re
from inspect import signature
from pathlib import Path
from sys import _getframe
from typing import Any, Dict, Mapping, Optional, Tuple
from warnings import warn, warn_explicit

from msgspec import NODEFAULT, Meta
from msgspec import ValidationError as MsgSpecValidationError
from msgspec.inspect import IntType, Metadata, type_info
from msgspec.json import Decoder
from pyramid.config import Configurator as PyramidConfigurator
from typing_extensions import Annotated

from nextgisweb.env import gettext
from nextgisweb.env.package import pkginfo
from nextgisweb.lib.apitype import ContentType, EmptyObject, JSONType, PathParam, QueryParam
from nextgisweb.lib.apitype.query_string import QueryParamError, QueryParamRequired
from nextgisweb.lib.apitype.schema import _AnyOfRuntime
from nextgisweb.lib.apitype.util import disannotate, is_struct
from nextgisweb.lib.imptool import module_from_stack, module_path
from nextgisweb.lib.logging import logger

from nextgisweb.core.exception import ValidationError, user_exception

from .helper import RouteHelper
from .inspect import iter_routes
from .predicate import ErrorRendererPredicate, RequestMethodPredicate, RouteMeta, ViewMeta
from .util import push_stacklevel


def _json_msgspec_factory(typedef):
    decoder = Decoder(typedef)

    def _json_msgspec(request):
        try:
            return decoder.decode(request.body)
        except MsgSpecValidationError as exc:
            raise ValidationError(message=exc.args[0]) from exc

    return _json_msgspec


def _view_driver_factory(
    view,
    pass_context,
    *,
    path_params: Mapping[str, PathParam],
    query_params: Mapping[str, QueryParam],
    body: Optional[Tuple[str, Any]],
    result: Any,
):
    extract = list()

    extract.extend(
        # NOTE: Decoded twice (the first one in request.path_param)
        (arg, lambda req, name=param.name, dec=param.decoder: dec(req.matchdict[name]))
        for arg, param in path_params.items()
    )

    extract.extend(
        (arg, lambda req, dec=param.decoder: dec(req.qs_parser))
        for arg, param in query_params.items()
    )

    if body is not None:
        extract.append(body)

    convert = None
    if result is EmptyObject:
        convert = lambda v, empty=EmptyObject(): empty if v is None else v

    if len(extract) == 0 and convert is None:
        return view

    if convert is None:
        convert = lambda x: x

    def _view(context, request):
        try:
            kw = {k: f(request) for k, f in extract}
        except QueryParamError as exc:
            _describe_query_param_error(exc)
            raise
        return convert(view(context, request, **kw) if pass_context else view(request, **kw))

    _view.__doc__ = view.__doc__
    return _view


def _describe_query_param_error(exc):
    name = exc.name
    data = dict(location=["query", exc.name])
    if isinstance(exc, QueryParamRequired):
        title = gettext("Parameter required")
        message = gettext("The '{}' query parameter is required.").format(exc.name)
    else:
        title = gettext("Invalid parameter")
        message = gettext("The '{}' query parameter has an invalid value.").format(name)
    user_exception(exc, title=title, message=message, data=data, http_status_code=422)


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
                        fn.relative_to(Path().resolve()),
                    )
                    return str(fn)
            parts.pop(-1)

    raise ValueError(f"Template '{name}' not found")


PATH_TYPE_UNKNOWN = Annotated[str, Meta(description="Undocumented")]
PATH_TYPES: Dict[str, Any] = dict(
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


class Configurator(PyramidConfigurator):
    def setup_registry(self, *args, **kwargs):
        super().setup_registry(*args, **kwargs)

        def path_param(request):
            for p in request.matched_route.predicates:
                if isinstance(p, RouteMeta):
                    md = request.matchdict
                    return {k: v(md[k]) for k, v in p.path_decoders}

        self.add_request_method(path_param, property=True)

    def add_default_view_predicates(self):
        import pyramid.predicates as pp

        self.add_view_predicate("meta", ViewMeta.as_predicate())
        self.add_view_predicate("request_method", RequestMethodPredicate)

        # Default pyramid predicates except RequestMethodPredicate
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

    def add_default_route_predicates(self):
        self.add_route_predicate("meta", RouteMeta.as_predicate())
        self.add_route_predicate("error_renderer", ErrorRendererPredicate)
        return super().add_default_route_predicates()

    def add_route(
        self,
        name,
        pattern=None,
        types=None,
        deprecated=False,
        openapi=True,
        **kwargs,
    ) -> RouteHelper:
        stacklevel = push_stacklevel(kwargs, False, True)
        component = pkginfo.component_by_module(module_from_stack(stacklevel - 1))

        client = True
        if "client" in kwargs:
            pclient = kwargs["client"]
            if pclient is not False:
                warn(
                    "The value of 'client' predicate other than False make "
                    "no sence since 4.5.0.dev14. You can safely remove it "
                    "from route declarations.",
                    DeprecationWarning,
                    stacklevel + 1,
                )
            else:
                client = False
            del kwargs["client"]

        if pattern is not None:
            opattern = pattern
            rtypes = dict()

            if factory := kwargs.get("factory"):
                rtypes.update(getattr(factory, "annotations", {}))

            if types:
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

            overloaded = kwargs.pop("overloaded", False)
            load_types = kwargs.pop("load_types", False)
            kwargs["meta"] = RouteMeta(
                component=component,
                itemplate=itemplate,
                overloaded=overloaded,
                client=client,
                load_types=load_types,
                ktemplate=ktemplate,
                path_params=path_params,
                path_decoders=path_decoders,
            )

        helper = RouteHelper(name, self, deprecated=deprecated, openapi=openapi)

        for m in ("head", "get", "post", "put", "delete", "options", "patch"):
            if v := kwargs.pop(m, None):
                getattr(helper, m)(v, stacklevel=stacklevel)

        super().add_route(name, pattern=pattern, **kwargs)
        return helper

    def add_view(self, view=None, *, deprecated=False, openapi=True, **kwargs):
        stacklevel = push_stacklevel(kwargs, False, True)
        component = pkginfo.component_by_module(module_from_stack(stacklevel - 1))

        if view is not None:
            # Extract attrs missing in kwargs from view.__pyramid_{attr}__
            attrs = {"renderer", "query_params"}.difference(set(kwargs.keys()))

            fn = view
            while fn and len(attrs) > 0:
                for attr in set(attrs):
                    if (v := getattr(fn, f"__pyramid_{attr}__", None)) is not None:
                        kwargs[attr] = v
                        attrs.remove(attr)
                fn = getattr(fn, "__wrapped__", None)

            sig = signature(view)

            body_type = None
            return_type = None

            has_request, has_context = False, False
            path_params: Dict[str, PathParam] = dict()
            query_params: Dict[str, QueryParam] = dict()
            body: Optional[Tuple[str, Any]] = None
            for idx, (name, p) in enumerate(sig.parameters.items()):
                if name == "request":
                    has_request = True
                    continue
                elif idx == 0:
                    has_context = True
                    if p.annotation is not p.empty and "context" not in kwargs:
                        kwargs["context"] = p.annotation
                    continue

                assert has_request or idx in (0, 1)

                if name in ("body", "json_body"):
                    assert body is None, "Got both of body and json_body arguments"
                    assert p.annotation is not p.empty, f"Type hint required for {name}"
                    body_type = p.annotation
                    body_base, body_extras = disannotate(body_type)
                    if is_struct(body_base) or (ContentType.JSON in body_extras):
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
                return_concrete, return_extras = disannotate(return_type)
                if (
                    return_concrete is EmptyObject
                    or is_struct(return_concrete)
                    or ContentType.JSON in return_extras
                    or _AnyOfRuntime in return_extras
                ):
                    return_renderer = "msgspec"

            if kwargs.get("renderer") is None and return_renderer is not None:
                kwargs["renderer"] = return_renderer

            view = _view_driver_factory(
                view,
                has_context,
                path_params=path_params,
                query_params=query_params,
                body=body,
                result=return_type,
            )

            if extra_query_params := kwargs.pop("query_params", None):
                query_params = query_params.copy()
                for eqp in extra_query_params:
                    if len(eqp) == 2:
                        eqp = eqp + (NODEFAULT,)
                    query_params[eqp[0]] = QueryParam(*eqp)

            kwargs["meta"] = ViewMeta(
                func=view,
                context=kwargs.get("context"),
                deprecated=deprecated,
                openapi=openapi,
                path_params=path_params,
                query_params=query_params,
                component=component,
                body_type=body_type,
                return_type=return_type,
            )

        if renderer := kwargs.get("renderer"):
            assert view is not None
            if renderer == "mako":
                renderer = view.__name__ + ".mako"
            if renderer.endswith(".mako") and (":" not in renderer):
                renderer = find_template(renderer, view)
            kwargs["renderer"] = renderer

        super().add_view(view=view, **kwargs)

    def commit(self):
        super().commit()

        for route in iter_routes(self.introspector):
            is_api = route.itemplate.startswith("/api/")
            methods = set()
            for view in route.views:
                if is_api and not isinstance(view.method, str):
                    _warn_from_info(
                        f"View for route '{route.name}' has invalid or missing "
                        f"request method ({view.method}), which is required "
                        f"for API routes since 4.5.0.dev16.",
                        view.info,
                    )

                if is_api and not route.overloaded and view.method in methods:
                    _warn_from_info(
                        f"Route '{route.name}' seems to be overloaded. Route "
                        f"predicate 'overloaded' is required for such routes "
                        f"since 4.5.0.dev17.",
                        view.info,
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


def _request_path_param(request):
    matchdict = request.matchdict
    return {k: v(matchdict[k]) for k, v in request.path_param_decoders}


def _warn_from_info(message, info):
    warn_explicit(
        message,
        category=DeprecationWarning,
        filename=info.file,
        lineno=info.line,
        module=__name__,
    )
