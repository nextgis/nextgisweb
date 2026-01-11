import pytest

from nextgisweb.lib.migration import MigrationGraph, resolve

from nextgisweb.pytest.env import generate_components

from ..migration import MigrationRegistry


@pytest.fixture(scope="module")
def graph(ngw_env):
    yield MigrationGraph(MigrationRegistry(ngw_env))


@pytest.mark.parametrize("component", generate_components())
def test_one_tail(graph, component):
    tails = graph.select("tail", component=component)
    assert len(tails) <= 1


@pytest.mark.parametrize("component", generate_components())
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
