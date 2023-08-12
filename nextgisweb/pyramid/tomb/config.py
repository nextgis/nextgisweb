from inspect import signature
from pathlib import Path
from sys import _getframe
from warnings import warn, warn_explicit

from msgspec import UNSET
from msgspec import ValidationError as MsgSpecValidationError
from msgspec.json import Decoder
from pyramid.config import Configurator as PyramidConfigurator

from nextgisweb.env.package import pkginfo
from nextgisweb.lib.apitype import (
    ContentType,
    JSONType,
    is_optional,
    iter_anyof,
    param_decoder,
)
from nextgisweb.lib.imptool import module_from_stack, module_path
from nextgisweb.lib.logging import logger

from nextgisweb.core.exception import ValidationError

from .helper import RouteHelper
from .inspect import iter_routes
from .predicate import ErrorRendererPredicate, RouteMeta, ViewMeta
from .util import ROUTE_PATTERN, ROUTE_RE, is_json_type, push_stacklevel


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


class Configurator(PyramidConfigurator):
    def add_default_view_predicates(self):
        self.add_view_predicate("meta", ViewMeta.as_predicate())
        return super().add_default_view_predicates()

    def add_default_route_predicates(self):
        self.add_route_predicate("meta", RouteMeta.as_predicate())
        self.add_route_predicate("error_renderer", ErrorRendererPredicate)
        return super().add_default_route_predicates()

    def add_route(self, name, pattern=None, deprecated=False, **kwargs) -> RouteHelper:
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
            pidx = 0

            def _pnum(m):
                nonlocal pidx
                res = f"{{{pidx}}}"
                pidx += 1
                return res

            template = ROUTE_RE.sub(_pnum, pattern)
            wotypes = ROUTE_RE.sub(lambda m: f"{{{m.group('k')}}}", pattern)

            mdtypes = dict()
            tmissing = False

            def _sub(m):
                k, t, r = m.groups()
                if t is not None:
                    mdtypes[k] = t
                    regexp = ROUTE_PATTERN[t]
                    return f"{{{k}:{regexp}}}" if regexp else f"{{{k}}}"
                elif r is None:
                    nonlocal tmissing
                    tmissing = True

                return m.group(0)

            pattern = ROUTE_RE.sub(_sub, pattern)

            if tmissing:
                warn(
                    f"Some matchdict type specifiers are missing for route "
                    f"{name} ({pattern}). Available since 4.5.0.dev13 and "
                    f"will be required in 4.6.0.dev0.",
                    DeprecationWarning,
                    stacklevel + 1,
                )

            kwargs["meta"] = RouteMeta(
                component=component,
                template=template,
                client=client,
                wotypes=wotypes,
                mdtypes=mdtypes,
            )

        methods = dict()
        for m in ("get", "post", "put", "delete", "options", "patch"):
            if v := kwargs.pop(m, None):
                methods[m] = v

        super().add_route(name, pattern=pattern, **kwargs)
        helper = RouteHelper(name, self, deprecated=deprecated)

        for m, v in methods.items():
            getattr(helper, m)(v, stacklevel=stacklevel)

        return helper

    def add_view(self, view=None, *, deprecated=False, **kwargs):
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
                elif is_json_type(return_type) or getattr(return_type, "_oneof", False):
                    kwargs["renderer"] = "msgspec"

            kwargs["meta"] = ViewMeta(
                func=view,
                deprecated=deprecated,
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
            for view in route.views:
                if getattr(view.func, "__name__", None) == "<lambda>":
                    _warn_from_info(
                        f"View for route '{route.name}' has a lambda-function "
                        f"handler, which is unsupported since 4.5.0.dev16.",
                        view.info,
                    )
                if is_api and type(view.method) != str:
                    _warn_from_info(
                        f"View for route '{route.name}' has invalid or missing "
                        f"request method, which is required for API "
                        f"routes since 4.5.0.dev16.",
                        view.info,
                    )


def _warn_from_info(message, info):
    warn_explicit(
        message,
        category=DeprecationWarning,
        filename=info.file,
        lineno=info.line,
        module=__name__,
    )