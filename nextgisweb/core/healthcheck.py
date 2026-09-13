import os
import tempfile
from datetime import datetime
from typing import Literal, Protocol, TypedDict

from sqlalchemy import create_engine, text
from sqlalchemy.exc import OperationalError

from nextgisweb.env import Component
from nextgisweb.env.hook import ComponentHook, ComponentHookProtocol
from nextgisweb.lib.datetime import utcnow_naive

from .component import CoreComponent


class HealthcheckSuccess(TypedDict):
    success: Literal[True]


class HealthcheckFailure(TypedDict):
    success: Literal[False]
    message: str


HealthcheckResult = HealthcheckSuccess | HealthcheckFailure


class HealthcheckProtocol(ComponentHookProtocol, Protocol):
    def __call__[C: Component](self, comp: C, /) -> HealthcheckResult: ...


healthcheck_hook = ComponentHook[HealthcheckProtocol]("healthcheck_hook")


@healthcheck_hook(stage="initial")
def healthcheck(comp: CoreComponent) -> HealthcheckResult:
    stat = os.statvfs(comp.options["sdir"])

    if (free_space := comp.options["healthcheck.free_space"]) > 0:
        if (free_space_current := stat.f_bavail / stat.f_blocks * 100) < free_space:
            return {
                "success": False,
                "message": "%.2f%% free space left on file storage." % free_space_current,
            }

    if (
        (free_inodes := comp.options["healthcheck.free_inodes"]) > 0
        and stat.f_ffree >= 0
        and stat.f_files > 0  # Not available in some FS
    ):
        if (free_inodes_current := stat.f_ffree / stat.f_files * 100) < free_inodes:
            return {
                "success": False,
                "message": "%.2f%% free inodes left on file storage." % free_inodes_current,
            }
    try:
        with tempfile.TemporaryFile(dir=comp.options["sdir"]):
            pass
    except OSError:
        return {
            "success": False,
            "message": "Could not create a file on file storage.",
        }

    try:
        sa_url = comp._engine_url(error_on_pwfile=True)
    except OSError:
        return {
            "success": False,
            "message": "Database password file is missing!",
        }

    sa_engine = create_engine(
        sa_url,
        connect_args=dict(
            connect_timeout=int(comp.options["database.connect_timeout"].total_seconds())
        ),
    )

    try:
        with sa_engine.connect() as conn:
            conn.execute(text("SELECT 1"))
    except OperationalError as exc:
        msg = str(exc.orig).rstrip()
        return {"success": False, "message": "Database connection failed: " + msg}

    sa_engine.dispose()

    if (
        (delta := comp.options["backup.interval"]) is not None
        and (last := comp.settings_get(comp.identity, "last_backup", None)) is not None
        and (utcnow_naive() - datetime.fromisoformat(last)) > delta
    ):
        return {"success": False, "message": "Backup has not been performed on time."}

    if (
        (delta := comp.options["maintenance.interval"]) is not None
        and (last := comp.settings_get(comp.identity, "last_maintenance", None)) is not None
        and (utcnow_naive() - datetime.fromisoformat(last)) > delta
    ):
        return {
            "success": False,
            "message": "Maintenance has not been performed on time.",
        }

    return {"success": True}
