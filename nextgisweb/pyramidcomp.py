# -*- coding: utf-8 -*-
from .component import Component

from pyramid.config import Configurator
from pyramid.authentication import AuthTktAuthenticationPolicy
from pyramid.authorization import ACLAuthorizationPolicy

import pyramid_tm


@Component.registry.register
class PyramidComponent(Component):
    identity = 'pyramid'

    def make_app(self, settings=None):
        settings = dict(self._settings, **settings)

        settings['mako.directories'] = 'nextgisweb:templates/'

        config = Configurator(settings=settings)

        config.include(pyramid_tm)

        assert 'secret' in settings, 'Secret not set!'
        authn_policy = AuthTktAuthenticationPolicy(secret=settings['secret'])
        config.set_authentication_policy(authn_policy)

        authz_policy = ACLAuthorizationPolicy()
        config.set_authorization_policy(authz_policy)

        config.add_static_view('static', 'static', cache_max_age=3600)
        config.add_route('home', '/')
        config.add_route('amd_package', '/amd_package/*subpath')

        # TODO: не лезть в приватные переменные _env
        for comp in self._env._components.itervalues():
            comp.setup_pyramid(config)
            comp.__class__.setup_routes(config)

        config.scan()

        return config

