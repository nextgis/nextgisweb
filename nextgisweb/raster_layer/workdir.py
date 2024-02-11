import os
from os.path import normpath, relpath
from pathlib import Path
from warnings import warn

from nextgisweb.env import Component, inject
from nextgisweb.lib.logging import logger

from nextgisweb.core import CoreComponent
from nextgisweb.file_storage import FileObj


class WorkdirMixin:
    def workdir_path(self, fobj: FileObj, *, makedirs=False) -> Path:
        fdata = fobj.filename(makedirs=makedirs)
        parts = fdata.parts[-3:]

        pwork = Path(_workdir_path(self), *parts[:-1])
        fwork = pwork / parts[-1]

        if not fwork.exists():
            pwork.mkdir(parents=True, exist_ok=True)
            relative = relpath(fdata, fwork.parent)
            fwork.symlink_to(relative)

        return fwork

    def workdir_filename(self, fobj: FileObj, *, makedirs=False) -> str:
        warn(
            f"{self.__class__.__name__}.workdir_filename is deprecated since "
            f"4.7.0.dev7. Use {self.__class__.__name__}.workdir_path instead.",
            DeprecationWarning,
            stacklevel=2,
        )
        return str(self.workdir_path(fobj, makedirs=makedirs))

    def workdir_cleanup(self):
        logger.info("Cleaning up %s working directory...", self.__class__.__name__)

        deleted_symlinks = deleted_ovr = deleted_bytes = 0
        kept_symlinks = kept_ovr = kept_bytes = 0

        workdir = _workdir_path(self)
        for dirpath, dirnames, filenames in os.walk(workdir, topdown=False):
            relist = False
            overviews = []

            for fn in filenames:
                fullfn = Path(dirpath) / fn
                if fullfn.suffix == ".ovr":
                    overviews.append(fullfn)
                elif fullfn.is_symlink():
                    size = fullfn.lstat().st_size
                    if fullfn.exists():
                        kept_symlinks += 1
                        kept_bytes += size
                    else:
                        fullfn.unlink()
                        relist = True
                        deleted_symlinks += 1
                        deleted_bytes += size

            for fullfn in overviews:
                size = fullfn.stat().st_size
                if fullfn.with_suffix("").exists():
                    kept_ovr += 1
                    kept_bytes += size
                else:
                    fullfn.unlink()
                    relist = True
                    deleted_ovr += 1
                    deleted_bytes += size

            if dirpath != normpath(workdir) and (
                (not relist and len(filenames) == 0 and len(dirnames) == 0)
                or len(os.listdir(dirpath)) == 0
            ):
                os.rmdir(dirpath)

        logger.info(
            "Deleted: %d symlinks, %d raster overviews (%d bytes)",
            deleted_symlinks,
            deleted_ovr,
            deleted_bytes,
        )

        logger.info(
            "Preserved: %d symlinks, %d raster overviews (%d bytes)",
            kept_symlinks,
            kept_ovr,
            kept_bytes,
        )


@inject()
def _workdir_path(comp: Component, *, core: CoreComponent) -> Path:
    return Path(core.gtsdir(comp))  # type: ignore
