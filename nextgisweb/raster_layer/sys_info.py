from nextgisweb.env import gettext
from nextgisweb.lib.humanize import format_size

from nextgisweb.core.sys_info import SysInfoResult, sys_info_hook

from .component import RasterLayerComponent


@sys_info_hook()
def sys_info(comp: RasterLayerComponent) -> SysInfoResult:
    if comp.size_limit is not None:
        yield (gettext("Uncompressed raster size limit"), format_size(comp.size_limit))
