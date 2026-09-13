from nextgisweb.env import gettext

from nextgisweb.core.sys_info import SysInfoResult, sys_info_hook

from .component import PyramidComponent


@sys_info_hook()
def sys_info(comp: PyramidComponent) -> SysInfoResult:
    try:
        import uwsgi  # ty: ignore[unresolved-import]

        yield ("uWSGI", uwsgi.version.decode())
    except ImportError:
        pass

    if t := comp.options["request_timeout"]:
        yield (gettext("Request timeout"), str(t))

    lunkwill = comp.options["lunkwill.enabled"]
    yield ("Lunkwill", gettext("Enabled") if lunkwill else gettext("Disabled"))
