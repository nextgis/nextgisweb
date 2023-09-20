from pathlib import Path

import pytest

from ..graph import MigrationGraph
from ..registry import Registry


@pytest.fixture(scope="module")
def registry():
    regpath = Path(__file__).parent / "registry"

    reg = Registry()
    for c in ("foo", "bar"):
        reg.scandir(c, regpath / c)

    yield reg


@pytest.fixture(scope="module")
def graph(registry):
    yield MigrationGraph(registry, install_dependencies={"bar": ("foo",)})
