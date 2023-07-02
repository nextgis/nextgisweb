import logging
import os
import time

from nextgisweb.env import Env
from nextgisweb.env.package import single_component
from nextgisweb.lib.config import load_config
from nextgisweb.lib.imptool import deprecate
from nextgisweb.lib.logging import logger


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

    return dict(components={comp: dict(
        module='nextgisweb.{}'.format(comp),
        enabled=comp not in ('wfsclient', 'raster_mosaic')
    ) for comp in components})


def main(global_config=None, **settings):
    """ This function returns a Pyramid WSGI application. """

    env = Env(cfg=load_config(None, None), initialize=True, set_global=True)
    config = env.pyramid.make_app({})
    app = config.make_wsgi_app()
    _log_startup_time()
    return app


def _log_startup_time(level=logging.INFO):
    if logger.isEnabledFor(level):
        from psutil import Process
        psinfo = Process(os.getpid())
        startup_time = int(1000 * (time.time() - psinfo.create_time()))
        logger.log(level, "WSGI startup took %d msec", startup_time)


deprecate('nextgisweb.command', 'nextgisweb.env.legacy_command', since='4.4.0.dev6', remove='4.5.0.dev0')
deprecate('nextgisweb.component', 'nextgisweb.env', since='4.4.0.dev6', remove='4.5.0.dev0')
deprecate('nextgisweb.db', 'nextgisweb.lib.db', since='4.4.0.dev6', remove='4.5.0.dev0')
deprecate('nextgisweb.dynmenu', 'nextgisweb.lib.dynmenu', since='4.4.0.dev6', remove='4.5.0.dev0')
deprecate('nextgisweb.event', 'nextgisweb.lib.legacy_event', since='4.4.0.dev6', remove='4.5.0.dev0')
deprecate('nextgisweb.file_storage.models', 'nextgisweb.file_storage.model', since='4.4.0.dev6', remove='4.5.0.dev0')
deprecate('nextgisweb.layer.models', 'nextgisweb.layer.model', since='4.4.0.dev6', remove='4.5.0.dev0')
deprecate('nextgisweb.models', 'nextgisweb.env.model', since='4.4.0.dev6', remove='4.5.0.dev0')
deprecate('nextgisweb.package', 'nextgisweb.env.package', since='4.4.0.dev6', remove='4.5.0.dev0')
deprecate('nextgisweb.psection', 'nextgisweb.pyramid.psection', since='4.4.0.dev6', remove='4.5.0.dev0')
deprecate('nextgisweb.registry', 'nextgisweb.lib.registry', since='4.4.0.dev6', remove='4.5.0.dev0')
