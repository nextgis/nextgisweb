from nextgisweb.env import gettext
from nextgisweb.lib.humanize import format_size

from nextgisweb.core.sys_info import SysInfoResult, sys_info_hook

from .component import FileUploadComponent


@sys_info_hook()
def sys_info(comp: FileUploadComponent) -> SysInfoResult:
    yield (
        gettext("Uploaded file size limit"),
        format_size(comp.max_size),
    )
