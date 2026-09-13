import re
from subprocess import check_output

from nextgisweb.lib.logging import logger

from nextgisweb.core.sys_info import SysInfoResult, sys_info_hook

from .component import JSRealmComponent


@sys_info_hook()
def sys_info(comp: JSRealmComponent) -> SysInfoResult:
    try:
        out = check_output(["node", "--version"], universal_newlines=True).strip()
        if m := re.match("v?(.*)", out):
            node_version = m.group(1)
        else:
            raise ValueError("Regex match failed: %s" % out)
    except Exception:
        logger.error("Failed to get node version", exc_info=True)
    else:
        yield ("Node", node_version)
