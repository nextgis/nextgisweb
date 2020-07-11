# -*- coding: utf-8 -*-
import sys
import os.path
import re
import warnings
from datetime import datetime as dt, timedelta
from hashlib import md5
from pkg_resources import resource_filename, get_distribution
from collections import namedtuple
from six import StringIO

from pyramid.authorization import ACLAuthorizationPolicy
from pyramid.events import BeforeRender

import pyramid_tm
import pyramid_mako
import transaction

from ..lib.config import Option
from ..package import pkginfo
from ..component import Component

from .config import Configurator
from .renderer import json_renderer
from .util import (
    viewargs,
    ClientRoutePredicate,
    RequestMethodPredicate,
    JsonPredicate,
    gensecret,
    persistent_secret)
from .auth import AuthenticationPolicy
from .model import Base, Session, SessionStore
from .session import WebSession
from . import exception

__all__ = ['viewargs', ]


DistInfo = namedtuple('DistInfo', ['name', 'version', 'commit'])


class PyramidComponent(Component):
    identity = 'pyramid'
    metadata = Base.metadata

    def make_app(self, settings=None):
        settings = dict(self._settings, **settings)

        settings['mako.directories'] = 'nextgisweb:templates/'

        is_debug = self.env.core.debug

        settings['mako.imports'] = settings.get('mako.imports', []) + [
            'import six', 'from nextgisweb.i18n import tcheck']

        # If debug is on, add mako-filter that checks
        # if the line was translated before output.
        if is_debug:
            settings['mako.default_filters'] = ['tcheck', 'h']

        # If pyramid config doesn't state otherwise, use locale from,
        # core component, while this is not clear why we need that.

        plockey = 'pyramid.default_locale_name'
        if plockey not in settings and self.env.core.locale_default is not None:
            settings[plockey] = self.env.core.locale_default

        config = Configurator(settings=settings)

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

        config.add_request_method(
            lambda request: request.path_info.lower().startswith('/api/'),
            'is_api', property=True, reify=True)

        self.error_handlers = list()

        @self.error_handlers.append
        def api_error_handler(request, err_info, exc, exc_info):
            if request.is_api or request.is_xhr:
                return exception.json_error_response(
                    request, err_info, exc, exc_info, debug=is_debug)

        def error_handler(request, err_info, exc, exc_info, **kwargs):
            for handler in self.error_handlers:
                result = handler(request, err_info, exc, exc_info)
                if result is not None:
                    return result

        config.registry.settings['error.err_response'] = error_handler
        config.registry.settings['error.exc_response'] = error_handler
        config.include(exception)

        config.add_tween(
            'nextgisweb.pyramid.util.header_encoding_tween_factory',
            over=('nextgisweb.pyramid.exception.unhandled_exception_tween_factory', ))

        # Access to Env through request.env
        config.add_request_method(
            lambda req: self._env, 'env',
            property=True)

        config.include(pyramid_tm)
        config.include(pyramid_mako)

        # Filter for quick translation. Defines function tr, which we can use
        # instead of request.localizer.translate in templates.
        def tr_subscriber(event):
            event['tr'] = event['request'].localizer.translate
        config.add_subscriber(tr_subscriber, BeforeRender)

        def _gensecret():
            if 'secret' in self.options:
                return self.options['secret']
            slength = 32
            self.logger.info("Generating pyramid cookie secret (%d chars)...", slength)
            return gensecret(slength)

        self.env.core.mksdir(self)
        sdir = self.env.core.gtsdir(self)

        secret = persistent_secret(os.path.join(sdir, 'secret'), _gensecret)
        if 'secret' in self.options:
            if self.options['secret'] == secret:
                self.logger.warn(
                    "Deprecated option [pyramid.secret]: Now cookie secret is generated "
                    "automaticaly and stored in data directory. Secret key was copied "
                    "there and now can be deleted from configuration options.")
            else:
                raise RuntimeError("Option [pyramid.secret] mismatch!")

        authn_policy = AuthenticationPolicy(settings=dict(secret=secret))
        config.set_authentication_policy(authn_policy)

        authz_policy = ACLAuthorizationPolicy()
        config.set_authorization_policy(authz_policy)

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
            with warnings.catch_warnings():
                warnings.filterwarnings('ignore', r'DEPRECATION: Python 2\.7 will reach')
                pip_main(['freeze', ])
            h = md5()
            h.update(buf.getvalue().encode('utf-8'))
            static_key = '/' + h.hexdigest()
        finally:
            sys.stdout = stdout

        self.distinfo = []

        # Read installed packages from pip freeze

        buf.seek(0)

        for line in buf:
            line = line.strip().lower()

            dinfo = None
            mpkg = re.match(r'(.+)==(.+)', line)
            if mpkg:
                dinfo = DistInfo(
                    name=mpkg.group(1),
                    version=mpkg.group(2),
                    commit=None)

            mgit = re.match(r'-e\sgit\+.+\@(.{8}).{32}\#egg=(\w+).*$', line)
            if mgit:
                dinfo = DistInfo(
                    name=mgit.group(2),
                    version=get_distribution(mgit.group(2)).version,
                    commit=mgit.group(1))

            if dinfo is not None:
                self.distinfo.append(dinfo)
            else:
                self.logger.warn("Could not parse pip freeze line: %s", line)

        config.add_static_view(
            '/static%s/asset' % static_key,
            'nextgisweb:static', cache_max_age=3600)

        config.add_route('amd_package', '/static%s/amd/*subpath' % static_key) \
            .add_view('nextgisweb.views.amd_package')

        chain = self._env.chain('setup_pyramid', first='pyramid')
        for comp in chain:
            comp.setup_pyramid(config)

        def html_error_handler(request, err_info, exc, exc_info):
            return exception.html_error_response(request, err_info, exc, exc_info, debug=is_debug)

        self.error_handlers.append(html_error_handler)

        def amd_base(request):
            amds = []
            for comp in self._env.chain('amd_base'):
                amds.extend(comp.amd_base)
            return amds

        config.add_request_method(amd_base, 'amd_base', property=True, reify=True)

        config.add_renderer('json', json_renderer)

        # Sessions
        config.set_session_factory(WebSession)

        # Replace default locale negotiator with session-based one
        def _locale_negotiator(request):
            return request.session.get('pyramid.locale')
        config.set_locale_negotiator(_locale_negotiator)

        return config

    def setup_pyramid(self, config):
        from . import view, api
        view.setup_pyramid(self, config)
        api.setup_pyramid(self, config)

    def client_settings(self, request):
        result = dict()

        result['support_url'] = self.env.core.support_url_view(request)

        try:
            result['units'] = self.env.core.settings_get('core', 'units')
        except KeyError:
            result['units'] = 'metric'

        try:
            result['degree_format'] = self.env.core.settings_get('core', 'degree_format')
        except KeyError:
            result['degree_format'] = 'dd'

        try:
            result['measurement_srid'] = self.env.core.settings_get('core', 'measurement_srid')
        except KeyError:
            result['measurement_srid'] = 4326

        result['company_logo'] = dict(
            enabled=self.company_logo_enabled(request),
            link=self.company_url_view(request))

        return result

    def maintenance(self):
        super(PyramidComponent, self).maintenance()
        self.cleanup()

    def cleanup(self):
        self.logger.info("Cleaning up sessions...")

        with transaction.manager:
            actual_date = dt.utcnow() - timedelta(seconds=self.options['session.max_age'])
            deleted_sessions = Session.filter(Session.last_activity < actual_date).delete()

        self.logger.info("Deleted: %d sessions", deleted_sessions)

    def backup_configure(self, config):
        super(PyramidComponent, self).backup_configure(config)
        config.exclude_table_data('public', Session.__tablename__)
        config.exclude_table_data('public', SessionStore.__tablename__)

    option_annotations = (
        Option('secret', doc="Cookies encryption key (deprecated)."),
        Option('logo'),
        Option('help_page.url', default="https://nextgis.com/redirect/{lang}/help/"),
        Option('help_page.enabled', bool, default=True),
        Option('favicon', default=resource_filename(
            'nextgisweb', 'static/img/favicon.ico')),

        Option('session.max_age', int, default=timedelta(days=7).total_seconds(),
               doc="Session lifetime in seconds."),

        Option('backup.download', bool, default=False),

        Option('sentry_dsn'),
        Option('desktop_gis_example', default='NextGIS QGIS'),
        Option('company_url', default="https://nextgis.com")
    )
