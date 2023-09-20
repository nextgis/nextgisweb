import pytest

from nextgisweb.env import Component, load_all
from nextgisweb.lib.migration import MigrationGraph, resolve

from ..migration import MigrationRegistry


def pytest_generate_tests(metafunc):
    if "component" in metafunc.fixturenames:
        load_all()
        metafunc.parametrize("component", Component.registry.keys())


@pytest.fixture(scope="module")
def graph(ngw_env):
    yield MigrationGraph(MigrationRegistry(ngw_env))


def test_one_tail(graph, component):
    tails = graph.select("tail", component=component)
    assert len(tails) <= 1


def test_one_head(graph, component):
    heads = graph.select("head", component=component)
    assert len(heads) <= 1


def test_tail_to_head(graph):
    operations = graph.operations(rewind=False, install=False, uninstall=False)
    resolve(
        operations,
        {m: m in graph._tails for m in graph.select("all")},
        {m: True for m in graph.select("head")},
    )
