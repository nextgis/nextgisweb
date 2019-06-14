# -*- coding: utf-8 -*-
import sys
import os.path
import re
from hashlib import md5
from StringIO import StringIO
from pkg_resources import resource_filename, get_distribution
from collections import namedtuple

from pyramid.config import Configurator
from pyramid.authorization import ACLAuthorizationPolicy
from pyramid.events import BeforeRender

import pyramid_tm
import pyramid_mako
import sentry_sdk

from sentry_sdk.integrations.pyramid import PyramidIntegration

from ..package import pkginfo
from ..component import Component

from .renderer import json_renderer
from .util import (
    viewargs,
    ClientRoutePredicate,
    RequestMethodPredicate,
    JsonPredicate)
from .auth import AuthenticationPolicy

__all__ = ['viewargs', ]


class RouteHelper(object):

    def __init__(self, name, config):
        self.config = config
        self.name = name

    def add_view(self, view=None, **kwargs):
        if 'route_name' not in kwargs:
            kwargs['route_name'] = self.name

        self.config.add_view(view=view, **kwargs)
        return self


class ExtendedConfigurator(Configurator):

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

        super(ExtendedConfigurator, self).add_route(
            name, pattern=pattern, **kwargs)

        return RouteHelper(name, self)

    def add_view(self, view=None, **kwargs):
        vargs = getattr(view, '__viewargs__', None)
        if vargs:
            kwargs = dict(vargs, **kwargs)

        super(ExtendedConfigurator, self).add_view(view=view, **kwargs)


DistInfo = namedtuple('DistInfo', ['name', 'version', 'commit'])


class PyramidComponent(Component):
    identity = 'pyramid'

    def make_app(self, settings=None):
        settings = dict(self._settings, **settings)

        settings['mako.directories'] = 'nextgisweb:templates/'

        # If debug is on, add mako-filter that checks
        # if the line was translated before output.

        if self.env.core.debug:
            settings['mako.default_filters'] = ['tcheck', 'h']
            settings['mako.imports'] = settings.get('mako.imports', []) \
                + ['from nextgisweb.i18n import tcheck', ]

        # If pyramid config doesn't state otherwise, use locale from,
        # core component, while this is not clear why we need that.

        plockey = 'pyramid.default_locale_name'
        if plockey not in settings and self.env.core.locale_default is not None:
            settings[plockey] = self.env.core.locale_default

        sentry_dsn = 'sentry_dsn'
        if sentry_dsn in settings:
            sentry_sdk.init(
                settings[sentry_dsn],
                integrations=[PyramidIntegration()],
            )

        config = ExtendedConfigurator(settings=settings)

        # Substitute localizer from pyramid with our own, original is
        # too tied to translationstring, that works strangely with string
        # interpolation via % operator.

        def localizer(request):
            return request.env.core.localizer(request.locale_name)
        config.add_request_method(localizer, 'localizer', property=True)

        # TODO: Need to get rid of translation dirs!
        # Currently used only to search for jed-files.

        for pkg in pkginfo.packages:
            dirname = resource_filename(pkg, 'locale')
            if os.path.isdir(dirname):
                config.add_translation_dirs(dirname)

        config.add_route_predicate('client', ClientRoutePredicate)

        config.add_view_predicate('method', RequestMethodPredicate)
        config.add_view_predicate('json', JsonPredicate)

        # Access to Env through request.env
        config.add_request_method(lambda (req): self._env, 'env',
                                  property=True)

        config.include(pyramid_tm)
        config.include(pyramid_mako)

        # Filter for quick translation. Defines function tr, which we can use
        # instead of request.localizer.translate in templates.
        def tr_subscriber(event):
            event['tr'] = event['request'].localizer.translate
        config.add_subscriber(tr_subscriber, BeforeRender)

        assert 'secret' in settings, 'Secret not set!'
        authn_policy = AuthenticationPolicy(settings=settings)
        config.set_authentication_policy(authn_policy)

        authz_policy = ACLAuthorizationPolicy()
        config.set_authorization_policy(authz_policy)

        # Help
        self.help_page = {}
        for key in settings.keys():
            if key.startswith('help_page'):
                hploc = key.split('.')[-1]
                self.help_page[hploc] = settings[key]

        # To not clear static cache by hand make it so that
        # URLs are different. Use md5 hash from all installed packages
        # which we can get with pip freeze. pip freeze
        # also returns current commit for packages from
        # VCS, this also helps.

        # This could've been done better, but right now simply
        # redirect sys.stdout to StringIO, run pip freeze and
        # return sys.stdout to initial state.

        try:
            from pip._internal import main as pip_main
        except ImportError:
            from pip import main as pip_main

        stdout = sys.stdout
        static_key = ''

        try:
            buf = StringIO()
            sys.stdout = buf
            pip_main(['freeze', ])
            h = md5()
            h.update(buf.getvalue())
            static_key = '/' + h.hexdigest()
        finally:
            sys.stdout = stdout

        self.distinfo = []

        # Read installed packages from pip freeze

        buf.seek(0)

        for l in buf:
            l = l.strip().lower()

            dinfo = None
            mpkg = re.match(r'(.+)==(.+)', l)
            if mpkg:
                dinfo = DistInfo(
                    name=mpkg.group(1),
                    version=mpkg.group(2),
                    commit=None)

            mgit = re.match(r'-e\sgit\+.+\@(.{8}).{32}\#egg=(\w+).*$', l)
            if mgit:
                dinfo = DistInfo(
                    name=mgit.group(2),
                    version=get_distribution(mgit.group(2)).version,
                    commit=mgit.group(1))

            if dinfo is not None:
                self.distinfo.append(dinfo)
            else:
                self.logger.warn("Could not parse pip freeze line: %s", l)

        config.add_static_view(
            '/static%s/asset' % static_key,
            'nextgisweb:static', cache_max_age=3600)

        config.add_route('amd_package', '/static%s/amd/*subpath' % static_key) \
            .add_view('nextgisweb.views.amd_package')

        for comp in self._env.chain('setup_pyramid'):
            comp.setup_pyramid(config)

        def amd_base(request):
            amds = []
            for comp in self._env.chain('amd_base'):
                amds.extend(comp.amd_base)
            return amds

        config.add_request_method(amd_base, 'amd_base', property=True, reify=True)

        config.add_renderer('json', json_renderer)

        return config

    def setup_pyramid(self, config):
        from . import view, api
        view.setup_pyramid(self, config)
        api.setup_pyramid(self, config)

    def client_settings(self, request):
        result = dict()

        try:
            result['units'] = self.env.core.settings_get('core', 'units')
        except KeyError:
            result['units'] = 'metric'

        try:
            result['degree_format'] = self.env.core.settings_get('core', 'degree_format')
        except KeyError:
            result['degree_format'] = 'dd'

        return result

    settings_info = (
        dict(key='secret', desc=u"Cookies encryption key (required)"),
        dict(key='help_page', desc=u"HTML help"),
        dict(key='favicon', desc=u"Favicon"),
        dict(key='sentry_dsn', desc=u"Sentry DSN"),
    )
