from nextgisweb.env import gettext

from nextgisweb.core.sys_info import SysInfoResult, sys_info_hook

from .component import RenderComponent


@sys_info_hook()
def sys_info(comp: RenderComponent) -> SysInfoResult:
    from .imgcodec import has_fpng

    yield ("Fast PNG", gettext("Enabled") if has_fpng else gettext("Disabled"))
