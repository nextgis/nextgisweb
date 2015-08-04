# -*- coding: utf-8 -*-
import os
import sys
from hashlib import md5
import re
import codecs
from StringIO import StringIO
from urllib2 import unquote
from pkg_resources import resource_filename
import json

from pyramid.config import Configurator
from pyramid.authentication import (
    AuthTktAuthenticationPolicy,
    BasicAuthAuthenticationPolicy)
from pyramid.authorization import ACLAuthorizationPolicy
from pyramid.httpexceptions import HTTPForbidden, HTTPNotFound
from pyramid.response import Response, FileResponse
from pyramid.events import BeforeRender

import pyramid_tm
import pyramid_mako

from ..component import Component
from ..auth import User
from .. import dynmenu as dm


def viewargs(**kw):

    def wrap(f):

        def wrapped(request, *args, **kwargs):
            return f(request, *args, **kwargs)

        wrapped.__name__ = 'args(%s)' % f.__name__
        wrapped.__viewargs__ = kw

        return wrapped

    return wrap


class RequestMethodPredicate(object):
    def __init__(self, val, config):
        if isinstance(val, basestring):
            val = (val, )

        self.val = val

    def text(self):
        return 'method = %s' % (self.val, )

    phash = text

    def __call__(self, context, request):
        return request.method in self.val


class JsonPredicate(object):
    target = ('application/json', )
    test = ('text/html', 'application/xhtml+xml', 'application/xml')

    def __init__(self, val, config):
        self.val = val

    def text(self):
        return 'json'

    phash = text

    def __call__(self, context, request):
        return self.val and (
            request.accept.best_match(self.target + self.test) in self.target
            or request.GET.get('format', None) == 'json')


class ClientRoutePredicate(object):
    def __init__(self, val, config):
        self.val = val

    def text(self):
        return 'client'

    phash = text

    def __call__(self, context, request):
        return True

    def __repr__(self):
        return "<client>"


class HTTPBasicAuthenticationPolicy(BasicAuthAuthenticationPolicy):

    def _get_credentials(self, request):
        """ Стандартный обработчик Pyramid всегда возвращает логин в качестве
        userid, однако нам нужно именно числовое значение ID. Поэтому подменим
        одно на другое в момент извлечения из заголовков запроса. """

        result = super(HTTPBasicAuthenticationPolicy, self) \
            ._get_credentials(request)

        if result is not None:
            username, password = result
            user = User.filter_by(keyname=username).first()
            if user is None:
                return (None, password)
            else:
                return (user.id, password)


class AuthenticationPolicy(object):

    def __init__(self, settings):
        def check(userid, password, request):
            user = User.filter_by(id=userid).first()
            if user is None or not (user.password == password):
                return None
            else:
                return user.id

        self.members = (
            AuthTktAuthenticationPolicy(
                secret=settings.get('secret'),
                cookie_name='tkt', hashalg='sha512',
                max_age=24 * 3600, reissue_time=3600,
                http_only=True),

            HTTPBasicAuthenticationPolicy(
                check=check, realm='NextGISWeb'),
        )

    def authenticated_userid(self, request):
        for m in self.members:
            userid = m.authenticated_userid(request)
            if userid is not None:
                return userid

    def effective_principals(self, request):
        return []

    def remember(self, request, userid):
        headers = []
        for m in self.members:
            res = m.remember(request, userid)
            if res:
                headers.extend(res)

        return headers

    def forget(self, request):
        headers = []
        for m in self.members:
            res = m.forget(request)
            if res:
                headers.extend(res)

        return headers

    def unauthenticated_userid(self, request):
        return None


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
        """ Расширенное добавление маршрута

        Синтаксический сахар, позволяющий записать часто встречающуюся
        конструкцию вида:

            config.add_route('foo', '/foo')
            config.add_view(foo_get, route_name='foo', request_method='GET')
            config.add_view(foo_post, route_name='foo', request_method='POST')


        Более компактным способом:

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


@Component.registry.register
class PyramidComponent(Component):
    identity = 'pyramid'

    def make_app(self, settings=None):
        settings = dict(self._settings, **settings)

        settings['mako.directories'] = 'nextgisweb:templates/'

        # Если включен режим отладки, то добавляем mako-фильтр, который
        # проверяет была ли переведена строка перед выводом.
        if self.env.core.debug:
            settings['mako.default_filters'] = ['tcheck', 'h']
            settings['mako.imports'] = settings.get('mako.imports', []) \
                + ['from nextgisweb.i18n import tcheck', ]

        # Если в конфиге pyramid не указано иное, то используем ту локаль,
        # которая указана в компоненте core, хотя зачем такое нужно не ясно.
        plockey = 'pyramid.default_locale_name'
        if plockey not in settings and self.env.core.locale is not None:
            settings[plockey] = self.env.core.locale

        config = ExtendedConfigurator(settings=settings)

        config.add_translation_dirs(resource_filename('nextgisweb', 'locale'))

        config.add_route_predicate('client', ClientRoutePredicate)

        config.add_view_predicate('method', RequestMethodPredicate)
        config.add_view_predicate('json', JsonPredicate)

        # Возможность доступа к Env через request.env
        config.set_request_property(lambda (req): self._env, 'env')

        config.include(pyramid_tm)
        config.include(pyramid_mako)

        # Фильтр для быстрого перевода строк. Определяет функцию tr, которую
        # можно использовать вместо request.localizer.translate в шаблонах.
        def tr_subscriber(event):
            event['tr'] = event['request'].localizer.translate
        config.add_subscriber(tr_subscriber, BeforeRender)

        assert 'secret' in settings, 'Secret not set!'
        authn_policy = AuthenticationPolicy(settings=settings)
        config.set_authentication_policy(authn_policy)

        authz_policy = ACLAuthorizationPolicy()
        config.set_authorization_policy(authz_policy)

        if 'help_page' not in settings:
            settings['help_page'] = resource_filename(
                'nextgisweb', 'userdoc/help.html')

        with codecs.open(settings['help_page'], 'rb', 'utf-8') as fp:
            self.help_page = fp.read()

        config.add_route('home', '/') \
            .add_view('nextgisweb.views.home')

        # Чтобы не приходилось вручную чистить кеш статики, сделаем
        # так, чтобы у них всегда были разные URL. В качестве ключа
        # используем хеш md5 от всех установленных в окружении пакетов,
        # который можно вытянуть через pip freeze. Так же pip freeze
        # вместе с версиями возвращает текущий коммит, для пакетов из
        # VCS, что тоже полезно.

        # Наверное это можно как-то получше сделать, но делаем так:
        # перенаправляем sys.stdout в StringIO, запускаем pip freeze и
        # затем возвращаем sys.stdout на место.

        stdout = sys.stdout
        static_key = ''

        try:
            import pip
            buf = StringIO()
            sys.stdout = buf
            pip.main(['freeze', ])
            h = md5()
            h.update(buf.getvalue())
            static_key = '/' + h.hexdigest()
        finally:
            sys.stdout = stdout

        self.pkginfo = []

        # Так же из вывода pip freeze читаем список установленных пакетов

        buf.seek(0)

        for l in buf:
            l = l.strip().lower()

            pkgtuple = None
            mpkg = re.match(r'(.+)==(.+)', l)
            if mpkg:
                pkgtuple = tuple(mpkg.groups())

            mgit = re.match(r'-e\sgit\+.+\@(.{8}).{32}\#egg=(\w+).*$', l)
            if mgit:
                pkgtuple = tuple(reversed(mgit.groups()))

            if pkgtuple is not None:
                self.pkginfo.append(pkgtuple)
            else:
                self.logger.warn("Could not parse pip freeze line: %s", l)

        config.add_static_view(
            '/static%s/asset' % static_key,
            'nextgisweb:static', cache_max_age=3600)

        config.add_route('amd_package', '/static%s/amd/*subpath' % static_key) \
            .add_view('nextgisweb.views.amd_package')

        for comp in self._env.chain('setup_pyramid'):
            comp.setup_pyramid(config)

        # TODO: не лезть в приватные переменные _env
        for comp in self._env._components.itervalues():
            comp.__class__.setup_routes(config)

        return config

    def setup_pyramid(self, config):

        def settings(request):
            comp = self.env._components[request.GET['component']]
            return comp.client_settings(request)

        config.add_route('pyramid.settings', '/settings') \
            .add_view(settings, renderer='json')

        def routes(request):
            result = dict()
            introspector = request.registry.introspector
            for itm in introspector.get_category('routes'):
                route = itm['introspectable']['object']
                for p in route.predicates:
                    if isinstance(p, ClientRoutePredicate):
                        result[route.name] = dict(
                            pattern=route.generate(dict(
                                [(k, '__%s__' % k)
                                 for k in p.val])),
                            keys=p.val)
            return result

        config.add_route('pyramid.routes', '/pyramid/routes') \
            .add_view(routes, renderer='json', json=True)

        def route(request):
            result = dict()

            route_re = re.compile(r'\{(\w+):{0,1}')

            introspector = request.registry.introspector
            for itm in introspector.get_category('routes'):
                route = itm['introspectable']['object']
                for p in route.predicates:
                    if isinstance(p, ClientRoutePredicate):
                        kys = route_re.findall(route.path)
                        kvs = dict([
                            (k, '{%d}' % idx)
                            for idx, k in enumerate(kys)])
                        tpl = unquote(route.generate(kvs))
                        result[route.name] = [tpl, ] + kys

            return result

        config.add_route('pyramid.route', '/api/component/pyramid/route') \
            .add_view(route, renderer='json')

        def locale_data(request):
            locale = request.matchdict['locale']
            component = request.matchdict['component']
            introspector = request.registry.introspector
            for itm in introspector.get_category('translation directories'):
                tdir = itm['introspectable']['directory']
                jsonpath = os.path.normpath(os.path.join(
                    tdir, locale, 'LC_MESSAGES', component) + '.jed')
                if os.path.isfile(jsonpath):
                    return FileResponse(
                        jsonpath, content_type=b'application/json')

            return Response(json.dumps(dict(
                error="Locale data not found!"
            )), status_code=404, content_type=b'application/json')

        config.add_route(
            'pyramid.locdata',
            '/api/component/pyramid/locdata/{locale}/{component}',
            client=('locale', 'component'),
        ).add_view(locale_data, renderer='json')

        def control_panel(request):
            if not request.user.is_administrator:
                raise HTTPForbidden()

            return dict(title=u"Панель управления",
                        control_panel=self.control_panel)

        config.add_route('pyramid.control_panel', '/control-panel') \
            .add_view(control_panel, renderer="pyramid/control_panel.mako")

        def help_page(request):
            return dict(title=u"Справка", help_page=self.help_page)

        config.add_route('pyramid.help_page', '/help-page') \
            .add_view(help_page, renderer="pyramid/help_page.mako")

        def logo(request):
            settings = request.env.pyramid.settings
            if 'logo' in settings and os.path.isfile(settings['logo']):
                return FileResponse(settings['logo'], request=request)
            else:
                raise HTTPNotFound()

        config.add_route('pyramid.logo', '/logo').add_view(logo)

        def favicon(request):
            settings = request.env.pyramid.settings
            if 'favicon' in settings and os.path.isfile(settings['favicon']):
                return FileResponse(settings['favicon'],
                                    request=request,
                                    content_type='image/x-icon')
            else:
                raise HTTPNotFound()

        config.add_route('pyramid.favicon', '/favicon.ico').add_view(favicon)

        def pkginfo(request):
            return dict(title=u"Версии пакетов",
                        pkginfo=self.pkginfo,
                        dynmenu=self.control_panel)

        config.add_route('pyramid.pkginfo', '/sys/pkginfo') \
            .add_view(pkginfo, renderer="pyramid/pkginfo.mako")

        self.control_panel = dm.DynMenu(
            dm.Label('sys', u"Информация о системе"),

            dm.Link('sys/pkginfo', u"Версии пакетов", lambda args: (
                args.request.route_url('pyramid.pkginfo'))),
        )

    settings_info = (
        dict(key='secret', desc=u"Ключ, используемый для шифрования cookies (обязательно)"),
        dict(key='help_page', desc=u"HTML-справка"),
        dict(key='logo', desc=u"Логотип системы"),
        dict(key='favicon', desc=u"Значок для избранного"),
        dict(key='home_url', desc=u"Ссылка для редиректа, при заходе на /")
    )
