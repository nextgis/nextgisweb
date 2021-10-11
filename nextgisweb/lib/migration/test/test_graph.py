from nextgisweb.lib.migration.revision import REVID_ZERO
from nextgisweb.lib.migration.registry import MigrationKey
from nextgisweb.lib.migration.graph import resolve


def test_ancestors(graph):
    for c in graph._components:
        assert MigrationKey(c, REVID_ZERO) not in graph._ancestors


def test_tails(graph):
    for key in graph._tails:
        assert key.revision == REVID_ZERO


def test_heads(graph):
    for key in graph.select('head'):
        assert key.revision != REVID_ZERO


def test_tail_to_head(graph):
    operations = graph.operations()

    cstate = {k: k in graph._tails for k in graph._nodes}

    solution = resolve(
        operations, cstate,
        {k: True for k in graph.select('head')})

    assert solution is not None
    print('\n' + '\n'.join(map(str, solution)))


def test_head_to_tail(graph):
    operations = graph.operations()

    solution = resolve(
        operations,
        {k: True for k in graph._nodes},
        {k: k in graph._tails for k in graph._nodes})

    assert solution is not None
    print('\n' + '\n'.join(map(str, solution)))


def test_install(graph):
    operations = graph.operations()

    s = resolve(
        operations,
        {k: False for k in graph._nodes},
        {k: True for k in graph._nodes if k.revision == REVID_ZERO})

    assert s is not None
    print('\n' + '\n'.join(map(str, s)))

    assert len(s) == 2
    assert s[0].component == 'foo' and s[0].opname == 'install'
    assert s[1].component == 'bar' and s[1].opname == 'install'


def test_uninstall(graph):
    operations = graph.operations()

    cstate = {k: True for k in graph._nodes}
    tstate = {k: False for k in graph._nodes if k.revision == REVID_ZERO}

    s = resolve(operations, cstate, tstate)

    assert s is not None
    print('\n' + '\n'.join(map(str, s)))

    assert len(s) == 2
    assert s[0].component == 'bar' and s[0].opname == 'uninstall'
    assert s[1].component == 'foo' and s[1].opname == 'uninstall'
