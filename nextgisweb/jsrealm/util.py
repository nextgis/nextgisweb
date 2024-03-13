from itertools import chain
from pathlib import Path
from textwrap import indent
from typing import Generator

from nextgisweb.lib.json import loads
from nextgisweb.lib.logging import logger


def validate_package_json(cid: str, package_json: Path):
    data = loads(package_json.read_text())
    assert data["name"].startswith("@nextgisweb/")
    assert data["version"] == "0.0.0"
    assert data["type"] == "module"

    if package_json.parent.name == "nodepkg":
        expected = "@nextgisweb/" + cid.replace("_", "-")
        assert data["name"].replace("_", "-") == expected

    return data["name"]


def scan_for_nodepkgs(cid: str, cpath: Path) -> Generator[Path, None, None]:
    nodepkg = cpath / "nodepkg"
    if not nodepkg.exists():
        return

    for package_json in chain(
        nodepkg.glob("package.json"),
        nodepkg.glob("*/package.json"),
    ):
        path = package_json.parent
        name = validate_package_json(cid, package_json)
        logger.debug("%s found in %s", name, path)
        yield path


def indented(lines, sep="\n"):
    return indent(sep.join(lines), "    ")
