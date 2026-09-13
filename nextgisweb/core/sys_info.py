import multiprocessing
import os
import os.path
import platform
import re
import sys
from collections.abc import Iterable
from datetime import datetime
from subprocess import check_output
from typing import Protocol

from sqlalchemy import text

from nextgisweb.env import Component, DBSession, gettext
from nextgisweb.env.hook import ComponentHook, ComponentHookProtocol
from nextgisweb.lib.i18n import TranslatableOrStr
from nextgisweb.lib.logging import logger

from .component import CoreComponent

SysInfoResult = Iterable[tuple[TranslatableOrStr, TranslatableOrStr]]


class SysInfoProtocol(ComponentHookProtocol, Protocol):
    def __call__[C: Component](self, comp: C, /) -> SysInfoResult: ...


sys_info_hook = ComponentHook[SysInfoProtocol]("sys_info_hook")


@sys_info_hook()
def sys_info(comp: CoreComponent) -> SysInfoResult:
    result: SysInfoResult = []
    sysinfo_host_config = comp.options["sysinfo_host_config"]

    def try_check_output(cmd):
        try:
            return check_output(cmd, universal_newlines=True).strip()
        except Exception:
            msg = "Failed to get sys info with command: '%s'" % " ".join(cmd)
            logger.error(msg, exc_info=True)

    def cpu_info():
        count = multiprocessing.cpu_count()
        model = None
        if cpuinfo := try_check_output(["cat", "/proc/cpuinfo"]):
            for line in cpuinfo.split("\n"):
                if match := re.match(r"model name\s*:?(.*)", line):
                    model = match.group(1).strip()
        if not model:
            model = platform.processor()
        model = re.sub(r"\(?(TM|R)\)", "", model)
        return f"{count} × {model}"

    if sysinfo_host_config:
        result.append((gettext("CPU"), cpu_info()))
        mem_bytes = os.sysconf("SC_PAGE_SIZE") * os.sysconf("SC_PHYS_PAGES")
        result.append((gettext("RAM"), f"{mem_bytes >> 20} MiB"))

        result.append((gettext("Linux kernel"), platform.release()))
        if os_distribution := try_check_output(["lsb_release", "-ds"]):
            result.append((gettext("OS distribution"), os_distribution))

    result.append(("Python", ".".join(map(str, sys.version_info[0:3]))))

    postgres_version = DBSession.scalar(text("SHOW server_version"))
    postgres_version = re.sub(r"\s\(.*\)$", "", postgres_version)

    sql_extra = """
        SELECT datcollate, datctype FROM pg_database
        WHERE datname = current_database()
    """
    postgres_extra = list(DBSession.execute(text(sql_extra)).one())

    sql_postgrespro = "SELECT EXISTS(SELECT * FROM pg_proc WHERE proname = 'pgpro_edition')"
    if DBSession.scalar(text(sql_postgrespro)):
        postgrespro_edition = DBSession.scalar(text("SELECT pgpro_edition()"))
        postgres_extra.append(f"Postgres Pro {postgrespro_edition.capitalize()}")

    result.append(("PostgreSQL", f"{postgres_version} ({', '.join(postgres_extra)})"))

    postgis_version = DBSession.scalar(text("SELECT PostGIS_Lib_Version()"))
    result.append(("PostGIS", postgis_version))

    gdal_version = try_check_output(["gdal-config", "--version"])
    if gdal_version is not None:
        result.append(("GDAL", gdal_version))

    if (instance_id := comp.instance_id) is not None:
        result.append((gettext("Instance ID"), instance_id))

    if (lb := comp.settings_get(comp.identity, "last_backup", None)) is not None:
        lb_dt = datetime.fromisoformat(lb).replace(microsecond=0)
        result.append((gettext("Last backup"), lb_dt.strftime("%Y-%m-%d %H:%M UTC")))

    if (lm := comp.settings_get(comp.identity, "last_maintenance", None)) is not None:
        lm_dt = datetime.fromisoformat(lm).replace(microsecond=0)
        result.append((gettext("Last maintenance"), lm_dt.strftime("%Y-%m-%d %H:%M UTC")))

    return result
