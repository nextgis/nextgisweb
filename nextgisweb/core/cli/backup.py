import os
import sys
from contextlib import contextmanager
from datetime import datetime
from pathlib import Path
from shutil import rmtree
from tempfile import TemporaryDirectory, mkdtemp, mkstemp
from typing import IO, Iterator
from zipfile import ZipFile, is_zipfile

import transaction

from nextgisweb.env import inject
from nextgisweb.env.cli import EnvCommand, arg, cli, opt
from nextgisweb.lib.datetime import utcnow_naive
from nextgisweb.lib.logging import logger

from .. import backup as mod
from ..component import CoreComponent


@cli.command()
def backup(
    self: EnvCommand,
    no_zip: bool = opt(False),
    one_shot: bool = opt(False),
    target: str | None = arg(metavar="path"),
    *,
    core: CoreComponent = inject.arg(),
):
    """Backup data into an archive

    :param no_zip: Don't compress a backup with ZIP
    :param one_shot: Don't record metadata about this backup
    :param target: Output file (use '-' for stdout) or directory"""

    opts = core.options.with_prefix("backup")

    if target is None:
        base_path = opts["path"]
        if base_path is None:
            raise RuntimeError("Default backup path (core.backup.path) isn't set")
        autoname = datetime.today().strftime(opts["filename"])
        ptarget = Path(base_path) / autoname
    else:
        ptarget = Path(target)

    to_stdout = target == "-"

    del target  # Avoid accidental usage

    started_at = utcnow_naive()
    tmp_root = Path(opts.get("tmpdir", ptarget.parent)) if not to_stdout else None

    if not to_stdout and ptarget.exists():
        raise RuntimeError("Target already exists!")

    if to_stdout:
        if no_zip:
            raise RuntimeError("Cannot write uncompressed backup to stdout")

        @contextmanager
        def tgt_context() -> Iterator[Path]:
            with TemporaryDirectory(dir=tmp_root) as tmp_dir:
                tmp_path = Path(tmp_dir)
                yield tmp_path
                _compress(tmp_path, sys.stdout.buffer)

    elif no_zip:

        @contextmanager
        def tgt_context() -> Iterator[Path]:
            tmp_path = Path(mkdtemp(dir=tmp_root))
            try:
                yield tmp_path
                logger.debug("Renaming '%s' to '%s'...", tmp_path, ptarget)
                tmp_path.rename(ptarget)
            except Exception:
                rmtree(tmp_path, ignore_errors=True)
                raise

    else:

        @contextmanager
        def tgt_context() -> Iterator[Path]:
            with TemporaryDirectory(dir=tmp_root) as tmp_dir:
                tmp_path = Path(tmp_dir)
                yield tmp_path
                tmp_arch = Path(mkstemp(dir=tmp_root)[1])
                tmp_arch.unlink()
                try:
                    _compress(tmp_path, tmp_arch)
                    logger.debug("Renaming '%s' to '%s'...", tmp_arch, ptarget)
                    tmp_arch.rename(ptarget)
                except Exception:
                    tmp_arch.unlink()
                    raise

    with tgt_context() as tgt:
        mod.backup(tgt)

    if not one_shot:
        with transaction.manager:
            core.settings_set(
                core.identity,
                "last_backup",
                started_at.isoformat(),
            )

    if not to_stdout:
        print(ptarget)


@cli.command()
def restore(
    self: EnvCommand,
    source: str = arg(metavar="path"),
    *,
    core: CoreComponent = inject.arg(),
):
    """Restore data from a backup

    :param path: Path to a backup (use '-' for stdin)"""

    opts = core.options.with_prefix("backup")

    if source == "-":
        del source  # Avoid accidental usage

        @contextmanager
        def src_context() -> Iterator[Path]:
            tmp_root = opts.get("tmpdir", None)
            with TemporaryDirectory(dir=tmp_root) as tmpdir:
                _decompress(sys.stdin.buffer, tmpdir)
                yield Path(tmpdir)

    else:
        psource = Path(source)
        del source  # Avoid accidental usage

        if psource.is_file() and is_zipfile(psource):

            @contextmanager
            def src_context() -> Iterator[Path]:
                tmp_root = opts.get("tmpdir", psource.parent)
                with TemporaryDirectory(dir=tmp_root) as tmpdir:
                    _decompress(psource, tmpdir)
                    yield Path(tmpdir)

        else:

            @contextmanager
            def src_context() -> Iterator[Path]:
                yield Path(psource)

    with src_context() as src:
        mod.restore(src)


def _compress(src: Path, dst: Path | IO[bytes]):
    logger.debug("Compressing '%s' to '%s'...", src, dst if isinstance(dst, Path) else "-")
    with ZipFile(dst, "w", allowZip64=True) as zipf:
        for root, _dirs, files in src.walk():
            relative_fn = root.relative_to(src)
            if len(relative_fn.parts) == 0:
                continue  # Skip the root directory itself

            # Write a directory entry for the current root
            zipf.write(root, relative_fn)

            for fn in files:
                filename = root / fn
                arcname = relative_fn / fn
                logger.debug("Writing '%s'...", arcname)
                zipf.write(filename, arcname)
                os.unlink(filename)  # Free space as soon as possible


def _decompress(src, dst):
    logger.debug("Decompressing '%s' to '%s'...", src if isinstance(src, str) else src.name, dst)
    with ZipFile(src, "r") as zipf:
        zipf.extractall(dst)
