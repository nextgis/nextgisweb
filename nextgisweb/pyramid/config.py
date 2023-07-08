from inspect import signature
from warnings import warn

from msgspec import Struct
from pyramid.config import Configurator as PyramidConfigurator

from .util import JSONType, find_template


class RouteHelper:

    def __init__(self, name, config):
        self.config = config
        self.name = name

    def add_view(self, view=None, **kwargs):
        if 'route_name' not in kwargs:
            kwargs['route_name'] = self.name

        self.config.add_view(view=view, stacklevel=1, **kwargs)
        return self


class Configurator(PyramidConfigurator):

    def add_route(self, name, pattern=None, **kwargs):
        """ Advanced route addition

        Syntax sugar that allows to record frequently used
        structure like:

            config.add_route('foo', '/foo')
            config.add_view(foo_get, route_name='foo', request_method='GET')
            config.add_view(foo_post, route_name='foo', request_method='POST')


        In a more compact way:

            config.add_route('foo', '/foo') \
                .add_view(foo_get, request_method='GET') \
                .add_view(foo_post, request_method='POST')

        """

        super().add_route(
            name, pattern=pattern, **kwargs)

        return RouteHelper(name, self)

    def add_view(self, view=None, stacklevel=0, **kwargs):
        if view and kwargs.get('renderer') and view.__name__ != '<lambda>':
            warn(
                "Since nextgisweb 4.4.0.dev7 use @viewargs(renderer=val) "
                "or JSONType return type annotation instead of "
                "Configurator.add_view(..., renderer=val) agrument.",
                DeprecationWarning, stacklevel=2 + stacklevel)

        if view is not None:
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
                return_annotation = signature(view).return_annotation
                if return_annotation is JSONType:
                    kwargs['renderer'] = 'json'
                elif issubclass(return_annotation, Struct):
                    kwargs['renderer'] = 'msgspec'

        if renderer := kwargs.get('renderer'):
            if renderer == 'mako':
                renderer = view.__name__ + '.mako'
            if renderer.endswith('.mako') and (':' not in renderer):
                renderer = find_template(renderer, view)
            kwargs['renderer'] = renderer

        super().add_view(view=view, **kwargs)
