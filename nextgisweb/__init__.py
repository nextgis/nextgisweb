from __future__ import annotations

import logging
import sys
from typing import TYPE_CHECKING

from . import workaround  # noqa: F401

__all__ = [
    "load_config",
    "single_component",
]

if TYPE_CHECKING:
    from nextgisweb.env.package import PackageInfo, single_component
    from nextgisweb.lib.config import load_config


def __getattr__(name: str) -> object:
    match name:
        case "single_component":
            from nextgisweb.env.package import single_component as v
        case "load_config":
            from nextgisweb.lib.config import load_config as v
        case _:
            raise AttributeError
    return v


def pkginfo() -> PackageInfo:
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
        "point_cloud",
        "basemap",
        "sld",
        "llm_core",
    )
    optional = {"raster_mosaic", "point_cloud"}
    assert all((i in components) for i in optional)

    return {
        "components": {
            comp: {
                "module": "nextgisweb.{}".format(comp),
                "enabled": comp not in optional,
            }
            for comp in components
        }
    }


def main(global_config=None, **settings) -> None:  # noqa: ANN001, ANN003
    """This function returns a Pyramid WSGI application."""

    def _smaps_rollup() -> str:
        with open("/proc/self/smaps_rollup") as f:
            return f.read()

    smaps_before = _smaps_rollup()
    modules_before = len(sys.modules)

    from nextgisweb.env import Env
    from nextgisweb.lib.config import load_config

    from nextgisweb.pyramid import PyramidComponent

    env = Env(cfg=load_config(None, None), initialize=True, set_global=True)
    config = env.component(PyramidComponent).make_app({})
    app = config.make_wsgi_app()

    logger = logging.getLogger("nextgisweb.wsgi")
    logger_level = logging.INFO

    if logger.isEnabledFor(logger_level):
        from os import sysconf
        from time import CLOCK_BOOTTIME, clock_gettime

        def _smaps_parse(text: str) -> tuple[int, int]:
            rss = -1
            pss = -1
            for line in text.splitlines():
                key, _, value = line.partition(":")
                if key in ("Rss", "Pss"):
                    value_mib = int(value.split()[0]) // 1024
                    if key == "Rss":
                        rss = value_mib
                    elif key == "Pss":
                        pss = value_mib
            return rss, pss

        def _process_uptime() -> int:
            with open("/proc/self/stat") as f:
                fields = f.read().rsplit(")", 1)[1].split()

            result_sec = clock_gettime(CLOCK_BOOTTIME) - int(fields[19]) / sysconf("SC_CLK_TCK")
            return int(1000 * result_sec)

        smaps_after = _smaps_rollup()
        modules_after = len(sys.modules)

        rss_before, pss_before = _smaps_parse(smaps_before)
        rss_after, pss_after = _smaps_parse(smaps_after)

        uptime = _process_uptime()
        logger.log(
            logger_level,
            f"WSGI app created in {uptime} ms, "
            f"RSS = {rss_after} MiB (was {rss_before}), "
            f"PSS = {pss_after} MiB (was {pss_before}), "
            f"{modules_after} modules (was {modules_before})",
        )

    return app
