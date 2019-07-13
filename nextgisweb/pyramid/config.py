# -*- coding: utf-8 -*-
from __future__ import division, absolute_import, print_function, unicode_literals

from pyramid.config import Configurator as PyramidConfigurator


class RouteHelper(object):

    def __init__(self, name, config):
        self.config = config
        self.name = name

    def add_view(self, view=None, **kwargs):
        if 'route_name' not in kwargs:
            kwargs['route_name'] = self.name

        self.config.add_view(view=view, **kwargs)
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

        super(Configurator, self).add_route(
            name, pattern=pattern, **kwargs)

        return RouteHelper(name, self)

    def add_view(self, view=None, **kwargs):
        vargs = getattr(view, '__viewargs__', None)
        if vargs:
            kwargs = dict(vargs, **kwargs)

        super(Configurator, self).add_view(view=view, **kwargs)
