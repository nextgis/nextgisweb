# -*- coding: utf-8 -*-
import codecs
from ConfigParser import ConfigParser

from pyramid.config import Configurator
from pyramid.paster import setup_logging
from pyramid.authentication import AuthTktAuthenticationPolicy
from pyramid.authorization import ACLAuthorizationPolicy

from sqlalchemy import engine_from_config

from .models import (
    DBSession,
    Base,
)

from .component import Component, load_all
from .env import Env, setenv


def pkginfo():
    components = (
        'core',
        'pyramidcomp',
        'auth',
        'resource',
        'resmeta',
        'spatial_ref_sys',
        'layer',
        'feature_layer',
        'feature_description',
        'feature_attachment',
        'render',
        'style',
        'marker_library',
        'webmap',
        'file_storage',
        'vector_layer',
        'postgis',
        'raster_layer',
        'raster_style',
        'wmsclient',
        'wmsserver',
        'wfsserver',
        'file_upload',
    )

    return dict(
        components=dict(map(
            lambda (i): (i, "nextgisweb.%s" % i),
            components)
        )
    )


def main(global_config, **settings):
    """ This function returns a Pyramid WSGI application. """

    if 'logging' in settings:
        setup_logging(settings['logging'])

    cfg = ConfigParser()
    cfg.readfp(codecs.open(settings['config'], 'r', 'utf-8'))

    env = Env(cfg)
    env.initialize()

    setenv(env)

    config = env.pyramid.make_app(settings)
    return config.make_wsgi_app()


def amd_packages():
    return (
        # Сторонние пакеты
        ('dojo', 'nextgisweb:amd_packages/contrib/dojo'),
        ('dijit', 'nextgisweb:amd_packages/contrib/dijit'),
        ('dojox', 'nextgisweb:amd_packages/contrib/dojox'),
        ('cbtree', 'nextgisweb:amd_packages/contrib/cbtree'),
        ('xstyle', 'nextgisweb:amd_packages/contrib/xstyle'),
        ('put-selector', 'nextgisweb:amd_packages/contrib/put-selector'),
        ('dgrid', 'nextgisweb:amd_packages/contrib/dgrid'),
        ('handlebars', 'nextgisweb:amd_packages/contrib/handlebars'),

        # Пакеты nextgisweb
        ('ngw', 'nextgisweb:amd_packages/ngw'),
        ('feature_layer', 'nextgisweb:amd_packages/feature_layer'),
        ('webmap', 'nextgisweb:amd_packages/webmap'),
        ('wmsclient', 'nextgisweb:amd_packages/wmsclient'),

        # Пакеты компонентов
        ('ngw-pyramid', 'nextgisweb:pyramidcomp/amd/ngw-pyramid'),
        ('ngw-resource', 'nextgisweb:resource/amd/ngw-resource'),
        ('ngw-resmeta', 'nextgisweb:resmeta/amd/ngw-resmeta'),
        ('ngw-feature-layer', 'nextgisweb:feature_layer/amd'),
        ('ngw-feature-description', 'nextgisweb:feature_description/amd'),
        ('ngw-feature-attachment', 'nextgisweb:feature_attachment/amd'),
        ('ngw-postgis', 'nextgisweb:postgis/amd/ngw-postgis'),
        ('ngw-wmsclient', 'nextgisweb:wmsclient/amd/ngw-wmsclient'),
        ('ngw-wmsserver', 'nextgisweb:wmsserver/amd/ngw-wmsserver'),
        ('ngw-wfsserver', 'nextgisweb:wfsserver/amd/ngw-wfsserver'),
        ('ngw-vector-layer', 'nextgisweb:vector_layer/amd/ngw-vector-layer'),
        ('ngw-raster-layer', 'nextgisweb:raster_layer/amd/ngw-raster-layer'),
        ('ngw-webmap', 'nextgisweb:webmap/amd/ngw-webmap'),
    )
