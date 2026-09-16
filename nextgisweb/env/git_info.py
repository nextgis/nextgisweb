from os import environ
from pathlib import Path
from subprocess import PIPE, run
from typing import NamedTuple

from nextgisweb.lib.logging import logger


class GitInfo(NamedTuple):
    commit: str
    dirty: bool


def git_info(path: Path) -> GitInfo | None:
    try:
        proc = run(
            [
                "git",
                "status",
                "--porcelain=v2",
                "--branch",
                "--no-ahead-behind",
                "--no-renames",
                "--untracked-files=no",
            ],
            cwd=path,
            stdout=PIPE,
            stderr=PIPE,
            text=True,
            env={**environ, "LC_ALL": "C"},
        )
    except OSError:
        logger.exception(f"Git failed in '{path}'")
        return None

    if proc.returncode != 0:
        lines = proc.stderr.strip().splitlines()
        if lines:
            msg = lines[-1].removeprefix("fatal: ").removesuffix(": .git")
            if msg.startswith("not a git repository "):
                return None
        else:
            msg = "<unknown error>"

        logger.error(f"Git failed in '{path}': {msg}")
        return None

    commit = None
    dirty = False

    oid_prefix = "# branch.oid "
    for line in proc.stdout.splitlines():
        if line.startswith(oid_prefix):
            commit = line.removeprefix(oid_prefix)
        elif not line.startswith("# "):
            dirty = True

    if commit is None or commit == "(initial)":
        return None

    return GitInfo(commit, dirty)
