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
from .env import Env


def main(global_config, **settings):
    """ This function returns a Pyramid WSGI application. """

    if 'logging' in settings:
        setup_logging(settings['logging'])

    cfg = ConfigParser()
    cfg.read((settings['config']))

    env = Env(cfg)
    env.initialize()

    config = env.pyramid.make_app(settings)
    return config.make_wsgi_app()


def amd_packages():
    return (
        ('ngw', 'nextgisweb:amd_packages/ngw'),
        ('dojo', 'nextgisweb:amd_packages/dojo'),
        ('dijit', 'nextgisweb:amd_packages/dijit'),
        ('dojox', 'nextgisweb:amd_packages/dojox'),
        ('cbtree', 'nextgisweb:amd_packages/cbtree'),
        ('layer', 'nextgisweb:amd_packages/layer'),
        ('style', 'nextgisweb:amd_packages/style'),
        ('webmap', 'nextgisweb:amd_packages/webmap'),
        ('vector_layer', 'nextgisweb:amd_packages/vector_layer'),
        ('raster_layer', 'nextgisweb:amd_packages/raster_layer'),
        ('raster_style', 'nextgisweb:amd_packages/raster_style'),
    )
