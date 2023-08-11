import re
from inspect import isclass, signature
from typing import Type
from warnings import warn

from msgspec import UNSET, Struct
from msgspec import ValidationError as MsgSpecValidationError
from msgspec.inspect import _is_typeddict
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
from nextgisweb.lib.imptool import module_from_stack

from nextgisweb.core.exception import ValidationError

from .util import RouteMeta, ViewMeta, find_template


def is_json_type(t: Type) -> bool:
    if isclass(t) and (issubclass(t, Struct) or _is_typeddict(t)):
        return True

    if ContentType.JSON in getattr(t, '__metadata__', ()):
        return True

    return False


def _stacklevel(kwargs, push):
    result = kwargs.pop('stacklevel', 0) + 1
    if push:
        kwargs['stacklevel'] = result
    return result


class RouteHelper:

    def __init__(self, name, config, *, deprecated=False):
        self.config = config
        self.name = name
        self.deprecated = deprecated

    def add_view(self, view=None, **kwargs):
        _stacklevel(kwargs, True)

        if 'route_name' not in kwargs:
            kwargs['route_name'] = self.name

        deprecated = kwargs.pop('deprecated', self.deprecated)
        self.config.add_view(view=view, deprecated=deprecated, **kwargs)

        return self

    def get(self, *args, **kwargs):
        _stacklevel(kwargs, True)
        return self.add_view(*args, request_method='GET', **kwargs)

    def post(self, *args, **kwargs):
        _stacklevel(kwargs, True)
        return self.add_view(*args, request_method='POST', **kwargs)

    def put(self, *args, **kwargs):
        _stacklevel(kwargs, True)
        return self.add_view(*args, request_method='PUT', **kwargs)

    def delete(self, *args, **kwargs):
        _stacklevel(kwargs, True)
        return self.add_view(*args, request_method='DELETE', **kwargs)

    def options(self, *args, **kwargs):
        _stacklevel(kwargs, True)
        return self.add_view(*args, request_method='OPTIONS', **kwargs)

    def patch(self, *args, **kwargs):
        _stacklevel(kwargs, True)
        return self.add_view(*args, request_method='PATCH', **kwargs)


ROUTE_PATTERN = dict(
    str=None,
    int=r'-?[0-9]+',
    uint=r'[0-9]+',
)

ROUTE_RE = re.compile(
    r'\{(?P<k>\w+)(?:\:(?P<t>(?:' +
    '|'.join(ROUTE_PATTERN.keys()) +
    r')))?(?:\:(?P<r>.+?))?\}'
)


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


class Configurator(PyramidConfigurator):
    predicates_ready = False

    def add_route(self, name, pattern=None, deprecated=False, **kwargs) -> RouteHelper:
        stacklevel = _stacklevel(kwargs, False)
        component = pkginfo.component_by_module(module_from_stack(stacklevel - 1))

        client = True
        if 'client' in kwargs:
            pclient = kwargs['client']
            if pclient is not False:
                warn(
                    "The value of 'client' predicate other than False make "
                    "no sence since 4.5.0.dev14. You can safely remove it "
                    "from route declarations.",
                    DeprecationWarning, stacklevel=stacklevel)
            else:
                client = False
            del kwargs['client']

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
                    DeprecationWarning, stacklevel=stacklevel)

            kwargs['meta'] = RouteMeta(template, wotypes, mdtypes, client, component)

        methods = dict()
        for m in ('get', 'post', 'put', 'delete', 'options', 'patch'):
            if v := kwargs.pop(m, None):
                methods[m] = v

        super().add_route(name, pattern=pattern, **kwargs)
        helper = RouteHelper(name, self, deprecated=deprecated)

        for m, v in methods.items():
            getattr(helper, m)(v, stacklevel=stacklevel)

        return helper

    def add_view(self, view=None, *, deprecated=False, **kwargs):
        stacklevel = _stacklevel(kwargs, False)
        component = pkginfo.component_by_module(module_from_stack(stacklevel - 1))

        if view and kwargs.get('renderer') and view.__name__ != '<lambda>':
            warn(
                "Since nextgisweb 4.4.0.dev7 use @viewargs(renderer=val) "
                "or JSONType return type annotation instead of "
                "Configurator.add_view(..., renderer=val) agrument.",
                DeprecationWarning, stacklevel=stacklevel)

        if view is not None:
            meta = ViewMeta(func=view, component=component, deprecated=deprecated)

            # Extract attrs missing in kwargs from view.__pyramid_{attr}__
            attrs = {'renderer', }.difference(set(kwargs.keys()))

            fn = view
            while fn and len(attrs) > 0:
                for attr in set(attrs):
                    if (v := getattr(fn, f'__pyramid_{attr}__', None)) is not None:
                        kwargs[attr] = v
                        attrs.remove(attr)
                fn = getattr(fn, '__wrapped__', None)

            sig = signature(view)

            pass_context = False
            meta.param_types = param_types = dict()
            pextractor = dict()
            for idx, (name, p) in enumerate(sig.parameters.items()):
                if name == 'request':
                    continue

                if idx == 0 and name != 'request':
                    pass_context = True
                    if p.annotation is not p.empty and 'context' not in kwargs:
                        kwargs['context'] = p.annotation

                assert idx < 2 or p.kind != p.POSITIONAL_ONLY

                if name in ('body', 'json_body'):
                    assert p.annotation is not p.empty

                    btype = p.annotation
                    bextract = None

                    if btype is JSONType:
                        bextract = _json_generic
                    elif is_json_type(btype):
                        bextract = _json_msgspec_factory(btype)
                    else:
                        ctmap = dict()
                        for bt, ct in iter_anyof(btype, ContentType()):
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
                    meta.body_type = btype

                    pextractor[name] = bextract

                elif p.kind == p.KEYWORD_ONLY:
                    ptype = p.annotation
                    pdefault = p.default if p.default is not p.empty else UNSET

                    param_types[name] = (ptype, pdefault)
                    pextractor[name] = _param_factory(name, ptype, pdefault)

            if len(pextractor) > 0:
                view = _view_driver_factory(view, pextractor, pass_context)

            if kwargs.get('renderer') is None:
                return_type = sig.return_annotation
                if return_type is sig.empty:
                    pass
                elif return_type is JSONType:
                    kwargs['renderer'] = 'json'
                    meta.return_type = return_type
                elif is_json_type(return_type) or getattr(return_type, '_oneof', False):
                    kwargs['renderer'] = 'msgspec'
                    meta.return_type = return_type

            if self.predicates_ready:
                kwargs['meta'] = meta

        if renderer := kwargs.get('renderer'):
            if renderer == 'mako':
                renderer = view.__name__ + '.mako'
            if renderer.endswith('.mako') and (':' not in renderer):
                renderer = find_template(renderer, view)
            kwargs['renderer'] = renderer

        super().add_view(view=view, **kwargs)
