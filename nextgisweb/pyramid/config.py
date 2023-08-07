import re
from inspect import isclass, signature
from warnings import warn

from msgspec import Struct
from pyramid.config import Configurator as PyramidConfigurator

from nextgisweb.lib.apitype import AsJSONMarker, JSONType

from .util import RouteMeta, ViewMeta, find_template


def _stacklevel(kwargs, push):
    result = kwargs.pop('stacklevel', 1) + 1
    if push:
        kwargs['stacklevel'] = result
    return result


class RouteHelper:

    def __init__(self, name, config):
        self.config = config
        self.name = name

    def add_view(self, view=None, **kwargs):
        _stacklevel(kwargs, True)

        if 'route_name' not in kwargs:
            kwargs['route_name'] = self.name

        self.config.add_view(view=view, **kwargs)
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


class Configurator(PyramidConfigurator):
    predicates_ready = False

    def add_route(self, name, pattern=None, **kwargs) -> RouteHelper:
        stacklevel = _stacklevel(kwargs, False)
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

            kwargs['meta'] = RouteMeta(template, wotypes, mdtypes, client)

        methods = dict()
        for m in ('get', 'post', 'put', 'delete', 'options', 'patch'):
            if v := kwargs.pop(m, None):
                methods[m] = v

        super().add_route(name, pattern=pattern, **kwargs)
        helper = RouteHelper(name, self)

        for m, v in methods.items():
            getattr(helper, m)(v)

        return helper

    def add_view(self, view=None, **kwargs):
        stacklevel = _stacklevel(kwargs, False)

        if view and kwargs.get('renderer') and view.__name__ != '<lambda>':
            warn(
                "Since nextgisweb 4.4.0.dev7 use @viewargs(renderer=val) "
                "or JSONType return type annotation instead of "
                "Configurator.add_view(..., renderer=val) agrument.",
                DeprecationWarning, stacklevel=stacklevel)

        if view is not None:
            meta = ViewMeta(func=view)

            # Extract attrs missing in kwargs from view.__pyramid_{attr}__
            attrs = {'renderer', }.difference(set(kwargs.keys()))

            fn = view
            while fn and len(attrs) > 0:
                for attr in set(attrs):
                    if (v := getattr(fn, f'__pyramid_{attr}__', None)) is not None:
                        kwargs[attr] = v
                        attrs.remove(attr)
                fn = getattr(fn, '__wrapped__', None)

            if kwargs.get('renderer') is None:
                sig = signature(view)
                return_type = sig.return_annotation
                if return_type is sig.empty:
                    pass
                elif return_type is JSONType:
                    kwargs['renderer'] = 'json'
                    meta.return_type = return_type
                elif isclass(return_type) and issubclass(return_type, Struct):
                    kwargs['renderer'] = 'msgspec'
                    meta.return_type = return_type
                else:
                    metadata = getattr(return_type, '__metadata__', ())
                    if AsJSONMarker in metadata:
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
