import os
import time
import logging

import psutil

from . import imptool
from .lib.config import load_config
from .lib.logging import logger
from .env import Env


def pkginfo():
    components = (
        'core',
        'sentry',
        'pyramid',
        'gui',
        'jsrealm',
        'auth',
        'resource',
        'resmeta',
        'social',
        'spatial_ref_sys',
        'layer',
        'layer_preview',
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


def main(global_config=None, **settings):
    """ This function returns a Pyramid WSGI application. """

    env = Env(cfg=load_config(None, None), initialize=True, set_global=True)
    config = env.pyramid.make_app({})
    app = config.make_wsgi_app()
    _log_startup_time()
    return app


def _log_startup_time(level=logging.INFO):
    if logger.isEnabledFor(level):
        psinfo = psutil.Process(os.getpid())
        startup_time = int(1000 * (time.time() - psinfo.create_time()))
        logger.log(level, "WSGI startup took %d msec", startup_time)


def amd_packages():
    return tuple(
        (k, 'external/{}'.format(k)) for k in (
            'dojo',
            'dijit',
            'dojox',
            'xstyle',
            'put-selector',
            'dgrid',

            'handlebars',
            'jed',
            'proj4',
            'codemirror',

            'jquery',
        )
    ) + (
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
