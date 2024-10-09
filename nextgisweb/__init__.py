import logging
import os
import time
from warnings import filterwarnings

from nextgisweb.env import Env
from nextgisweb.env.package import single_component
from nextgisweb.lib.config import load_config
from nextgisweb.lib.imptool import deprecate
from nextgisweb.lib.logging import logger

# Enable deprecation warnings for nextgisweb and nextgisweb_* packages.
filterwarnings("once", module=r"^nextgisweb(_\w+)?(\..*|$)", category=DeprecationWarning)


def pkginfo():
    components = (
        "core",
        "sentry",
        "pyramid",
        "gui",
        "jsrealm",
        "auth",
        "resource",
        "resmeta",
        "social",
        "spatial_ref_sys",
        "layer",
        "layer_preview",
        "feature_layer",
        "feature_description",
        "feature_attachment",
        "render",
        "svg_marker_library",
        "webmap",
        "file_storage",
        "vector_layer",
        "lookup_table",
        "postgis",
        "raster_layer",
        "raster_mosaic",
        "raster_style",
        "wfsserver",
        "wfsclient",
        "wmsclient",
        "wmsserver",
        "ogcfserver",
        "tmsclient",
        "file_upload",
        "audit",
        "tileset",
        "basemap",
        "sld",
    )
    optional = {"raster_mosaic"}
    assert all((i in components) for i in optional)

    return dict(
        components={
            comp: dict(
                module="nextgisweb.{}".format(comp),
                enabled=comp not in optional,
            )
            for comp in components
        }
    )


def main(global_config=None, **settings):
    """This function returns a Pyramid WSGI application."""

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


# NOTE: For hot module replacement with deprecation warning:
# deprecate("nextgisweb.some", "nextgisweb.lib.some", since="4.5.0.dev0", remove="4.6.0.dev0")

deprecate(
    "nextgisweb.resource.events",
    "nextgisweb.resource.event",
    since="4.9.0.dev16",
    remove="5.0.0.dev0",
)
