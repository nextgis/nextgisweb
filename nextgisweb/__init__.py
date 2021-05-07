# -*- coding: utf-8 -*-
from __future__ import division, unicode_literals, print_function, absolute_import
import os
import logging

from .lib.config import load_config
from .env import Env, setenv

logger = logging.getLogger(__name__)


def pkginfo():
    components = (
        'core',
        'sentry',
        'pyramid',
        'jsrealm',
        'auth',
        'resource',
        'resmeta',
        'social',
        'spatial_ref_sys',
        'layer',
        'feature_layer',
        'feature_description',
        'feature_attachment',
        'render',
        'svg_marker_library',
        'webmap',
        'file_storage',
        'vector_layer',
        'lookup_table',
        'postgis',
        'raster_layer',
        'raster_mosaic',
        'raster_style',
        'wfsserver',
        'wfsclient',
        'wmsclient',
        'wmsserver',
        'tmsclient',
        'file_upload',
        'audit',
    )

    return dict(
        components={
            comp: dict(
                module='nextgisweb.{}'.format(comp),
                enabled=comp not in ('wfsclient', 'raster_mosaic')
            ) for comp in components
        }
    )


def main(global_config, **settings):
    """ This function returns a Pyramid WSGI application. """

    env = Env(cfg=load_config(None, None))

    if 'NEXTGISWEB_LOGGING' in os.environ:
        logger.error(
            "Environment variable NEXTGISWEB_LOGGING was ignored! Use "
            "environment logging.* and logger.* options instead.")

    if 'logging' in settings:
        logger.error("Parameter 'logging' was ignored! Use NEXTGISWEB_LOGGING variable instead.")

    if 'config' in settings:
        logger.error("Parameter 'config' was ignored! Use NEXTGISWEB_CONFIG variable instead.")

    kset = set(settings.keys())
    kset = kset.difference(set(('logging', 'config')))
    if len(kset) > 0:
        logger.warn("Ignored paster's parameters: %s", ', '.join(kset))

    env.initialize()

    setenv(env)

    config = env.pyramid.make_app({})
    return config.make_wsgi_app()


def amd_packages():
    return tuple(
        (k, 'external/{}'.format(k)) for k in (
            'dojo',
            'dijit',
            'dojox',
            'xstyle',
            'put-selector',
            'dgrid',
            'cbtree',

            'handlebars',
            'jed',
            'proj4',
            'codemirror',
            'dom-to-image',
            'svg4everybody',
            'ie11-custom-properties',

            'jquery',
        )
    ) + (
        # nextgisweb packages
        ('ngw', 'nextgisweb:amd_packages/ngw'),

        # components packages
        ('ngw-pyramid', 'nextgisweb:pyramid/amd/ngw-pyramid'),
        ('ngw-resource', 'nextgisweb:resource/amd/ngw-resource'),
        ('ngw-resmeta', 'nextgisweb:resmeta/amd/ngw-resmeta'),
        ('ngw-social', 'nextgisweb:social/amd/ngw-social'),
        ('ngw-feature-layer', 'nextgisweb:feature_layer/amd/ngw-feature-layer'),
        ('ngw-feature-description', 'nextgisweb:feature_description/amd/ngw-feature-description'),
        ('ngw-feature-attachment', 'nextgisweb:feature_attachment/amd/ngw-feature-attachment'),
        ('ngw-lookup-table', 'nextgisweb:lookup_table/amd/ngw-lookup-table'),
        ('ngw-postgis', 'nextgisweb:postgis/amd/ngw-postgis'),
        ('ngw-wmsclient', 'nextgisweb:wmsclient/amd/ngw-wmsclient'),
        ('ngw-wmsserver', 'nextgisweb:wmsserver/amd/ngw-wmsserver'),
        ('ngw-wfsclient', 'nextgisweb:wfsclient/amd/ngw-wfsclient'),
        ('ngw-wfsserver', 'nextgisweb:wfsserver/amd/ngw-wfsserver'),
        ('ngw-tmsclient', 'nextgisweb:tmsclient/amd/ngw-tmsclient'),
        ('ngw-vector-layer', 'nextgisweb:vector_layer/amd/ngw-vector-layer'),
        ('ngw-raster-layer', 'nextgisweb:raster_layer/amd/ngw-raster-layer'),
        ('ngw-svg-marker-library', 'nextgisweb:svg_marker_library/amd/ngw-svg-marker-library'),
        ('ngw-raster-mosaic', 'nextgisweb:raster_mosaic/amd/ngw-raster-mosaic'),
        ('ngw-webmap', 'nextgisweb:webmap/amd/ngw-webmap'),
        ('ngw-auth', 'nextgisweb:auth/amd/ngw-auth'),
        ('ngw-file-upload', 'nextgisweb:file_upload/amd/ngw-file-upload'),
        ('ngw-spatial-ref-sys', 'nextgisweb:spatial_ref_sys/amd/ngw-spatial-ref-sys'),
        ('ngw-render', 'nextgisweb:render/amd/ngw-render'),
        ('ngw-audit', 'nextgisweb:audit/amd/ngw-audit'),
    )
