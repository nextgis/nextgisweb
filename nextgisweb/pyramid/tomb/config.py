import re
from inspect import signature
from pathlib import Path
from sys import _getframe
from warnings import warn, warn_explicit

from msgspec import UNSET, Meta
from msgspec import ValidationError as MsgSpecValidationError
from msgspec.inspect import IntType, Metadata, type_info
from msgspec.json import Decoder
from pyramid.config import Configurator as PyramidConfigurator
from typing_extensions import Annotated

from nextgisweb.env.package import pkginfo
from nextgisweb.lib.apitype import (
    ContentType,
    JSONType,
    is_anyof,
    is_optional,
    iter_anyof,
    param_decoder,
)
from nextgisweb.lib.imptool import module_from_stack, module_path
from nextgisweb.lib.logging import logger

from nextgisweb.core.exception import ValidationError

from .helper import RouteHelper
from .inspect import iter_routes
from .predicate import ErrorRendererPredicate, RequestMethodPredicate, RouteMeta, ViewMeta
from .util import is_json_type, push_stacklevel


def _json_generic(request):
    return request.json_body


def _json_msgspec_factory(typedef):
    decoder = Decoder(typedef)

    def _json_msgspec(request):
        try:
            return decoder.decode(request.body)
        except MsgSpecValidationError as exc:
            raise ValidationError(message=exc.args[0]) from exc

    return _json_msgspec


def _param_factory(name, tdef, default):
    optional, tdef = is_optional(tdef)
    if optional and default is UNSET:
        default = None

    decoder = param_decoder(tdef)

    def _param(request):
        s = request.GET.get(name, UNSET)
        if s is UNSET:
            if default is UNSET:
                raise ValueError
            return default

        try:
            res = decoder(s)
        except MsgSpecValidationError as exc:
            raise ValidationError(message=str(exc.args[0])) from exc
        return res

    return _param


def _view_driver_factory(view, pextractor, pass_context):
    def _view(context, request):
        kw = {k: f(request) for k, f in pextractor.items()}
        return view(context, request, **kw) if pass_context else view(request, **kw)

    _view.__doc__ = view.__doc__
    return _view


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
PATH_TYPES = dict(
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
            mdtypes = dict()

            if factory := kwargs.get("factory"):
                if factory_annotations := getattr(factory, "annotations", None):
                    mdtypes.update(factory_annotations)

            if types:
                mdtypes.update(types)

            pidx = 0

            def _pnum(m):
                nonlocal pidx
                res = f"{{{pidx}}}"
                pidx += 1
                return res

            template = PATH_PARAM_RE.sub(_pnum, pattern)
            wotypes = PATH_PARAM_RE.sub(lambda m: "{%s}" % m.group(1), pattern)

            def _sub(m):
                key, type_or_regexp = m.groups()

                if (tdef := mdtypes.get(key)) is None:
                    tdef = PATH_TYPES.get(type_or_regexp, PATH_TYPE_UNKNOWN)
                    mdtypes[key] = tdef

                if type_or_regexp:
                    if pdef := PATH_TYPES.get(type_or_regexp):
                        pattern = type_info(pdef).extra["route_pattern"]
                    else:
                        pattern = type_or_regexp
                else:
                    tinfo = type_info(tdef)
                    titype = tinfo.type if isinstance(tinfo, Metadata) else tinfo
                    if (
                        isinstance(tinfo, Metadata)
                        and tinfo.extra
                        and (extra_pattern := tinfo.extra["route_pattern"])
                    ):
                        pattern = extra_pattern
                    elif isinstance(titype, IntType):
                        if (titype.ge is not None and titype.ge >= 1) or (
                            titype.gt is not None and titype.gt >= 0
                        ):
                            pattern = r"0*[1-9][0-9]*"
                        elif (titype.ge is not None and titype.ge >= 0) or (
                            titype.gt is not None and titype.gt >= -1
                        ):
                            pattern = r"0*[1-9][0-9]*|0+"
                        else:
                            pattern = r"-?0*[1-9][0-9]*|0+"
                    else:
                        raise ValueError(f"Type or pattern required: {key}")

                return "{%s:%s}" % (key, pattern)

            pattern = PATH_PARAM_RE.sub(_sub, pattern)

            overloaded = kwargs.pop("overloaded", False)
            kwargs["meta"] = RouteMeta(
                component=component,
                template=template,
                overloaded=overloaded,
                client=client,
                wotypes=wotypes,
                mdtypes=mdtypes,
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
            attrs = {"renderer"}.difference(set(kwargs.keys()))

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

            pass_context = False
            param_types = dict()
            pextractor = dict()
            for idx, (name, p) in enumerate(sig.parameters.items()):
                if name == "request":
                    continue

                if idx == 0 and name != "request":
                    pass_context = True
                    if p.annotation is not p.empty and "context" not in kwargs:
                        kwargs["context"] = p.annotation

                assert idx < 2 or p.kind != p.POSITIONAL_ONLY

                if name in ("body", "json_body"):
                    assert body_type is None and p.annotation is not p.empty

                    body_type = p.annotation
                    bextract = None

                    if body_type is JSONType:
                        bextract = _json_generic
                    elif is_json_type(body_type):
                        bextract = _json_msgspec_factory(body_type)
                    else:
                        ctmap = dict()
                        for bt, ct in iter_anyof(body_type, ContentType()):
                            assert ct is not None
                            ctmap[ct] = bt
                        if len(ctmap) > 0:

                            def bextract(request):
                                rct = request.content_type
                                for ct, bt in ctmap.items():
                                    if ct != rct:
                                        continue
                                    if ct == "application/json":
                                        d = Decoder(bt)
                                        res = d.decode(request.body)
                                        return res
                                    elif ct.startswith("text/"):
                                        return request.body.decode(request.charset)

                                raise ValueError

                    assert bextract is not None

                    pextractor[name] = bextract

                elif p.kind == p.KEYWORD_ONLY:
                    ptype = p.annotation
                    pdefault = p.default if p.default is not p.empty else UNSET

                    param_types[name] = (ptype, pdefault)
                    pextractor[name] = _param_factory(name, ptype, pdefault)

            if len(pextractor) > 0:
                view = _view_driver_factory(view, pextractor, pass_context)

            if kwargs.get("renderer") is None:
                assert return_type is None
                return_type = sig.return_annotation
                if return_type is sig.empty:
                    return_type = None
                elif return_type is JSONType:
                    kwargs["renderer"] = "json"
                elif is_json_type(return_type) or is_anyof(return_type):
                    kwargs["renderer"] = "msgspec"

            kwargs["meta"] = ViewMeta(
                func=view,
                context=kwargs.get("context"),
                deprecated=deprecated,
                openapi=openapi,
                component=component,
                param_types=param_types,
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
            is_api = route.template.startswith("/api/")
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


def _warn_from_info(message, info):
    warn_explicit(
        message,
        category=DeprecationWarning,
        filename=info.file,
        lineno=info.line,
        module=__name__,
    )
