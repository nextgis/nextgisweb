import sqlite3
from textwrap import dedent
from contextlib import contextmanager

from nextgisweb.lib.migration.graph import (
    resolve,
    InstallOperation, UninstallOperation,
    ForwardOperation, RewindOperation)


def foo_install(ctx):
    ctx.execute(dedent("""
        CREATE TABLE foo (
            id INTEGER PRIMARY KEY,
            value TEXT
        );

        CREATE TABLE foo_a (id INTEGER PRIMARY KEY);
        CREATE TABLE foo_b (id INTEGER PRIMARY KEY);

        INSERT INTO foo VALUES (1, 'value');
    """))


def foo_uninstall(ctx):
    ctx.execute(dedent("""
        DROP TABLE foo_b;
        DROP TABLE foo_a;
        DROP TABLE foo;
    """))


def bar_install(ctx):
    ctx.execute(dedent("""
        CREATE TABLE bar (
            id INTEGER PRIMARY KEY,
            foo_id INTEGER NOT NULL,
            FOREIGN KEY(foo_id) REFERENCES foo(id)
        );

        INSERT INTO bar VALUES (1, 1);
    """))


def bar_uninstall(ctx):
    ctx.execute("DROP TABLE bar")


def initial(ctx):
    ctx.execute(dedent("""
        CREATE TABLE foo (
            id TEXT PRIMARY KEY,
            value TEXT
        );

        INSERT INTO foo VALUES ('1', 'value');

        CREATE TABLE bar (
            id INTEGER PRIMARY KEY,
            foo_id TEXT NOT NULL,
            FOREIGN KEY(foo_id) REFERENCES foo(id)
        );

        INSERT INTO bar VALUES (1, '1');
    """))
    return ctx


class Context(object):

    def __init__(self):
        self._conn = sqlite3.connect(':memory:')
        self._conn.execute('PRAGMA foreign_keys = ON')

    def execute(self, sql):
        self._conn.executescript(sql)

    def operation(self, operation):
        if isinstance(operation, (InstallOperation, UninstallOperation)):
            m = globals().get('{}_{}'.format(operation.component, operation.opname))
            m(self)
        elif isinstance(operation, (ForwardOperation, RewindOperation)):
            m = getattr(operation.migration, '{}_callable'.format(operation.opname))
            m(self)

    def dump(self):
        return '\n'.join((
            line for line in self._conn.iterdump()
            if not line.startswith(('BEGIN ', 'COMMIT'))
        ))

    def install(self):
        foo_install(self)
        bar_install(self)
        return self

    def uninstall(self):
        bar_uninstall(self)
        foo_uninstall(self)
        return self


@contextmanager
def compare_ctx(ctx):
    ref = ctx.dump()
    yield
    new = ctx.dump()
    assert ref == new


def test_selftest():
    ctx = Context()

    with compare_ctx(ctx):
        ctx.install()
        ctx.uninstall()


def test_install_unistall(graph):
    operations = graph.operations(forward=False, rewind=False)
    ctx = Context()

    with compare_ctx(ctx):
        solution = resolve(
            operations, {k: False for k in graph._nodes},
            {k: True for k in graph._nodes})

        for op in solution:
            ctx.operation(op)

        solution = resolve(
            operations,
            {k: True for k in graph._nodes},
            {k: False for k in graph._nodes})

        print('\n'.join(map(str, solution)))

        for op in solution:
            ctx.operation(op)


def test_forward(graph):
    operations = graph.operations(install=False, forward=True, uninstall=False, rewind=False)

    ctx = Context()
    initial(ctx)

    solution = resolve(
        operations,
        {k: k in graph._tails for k in graph._nodes},
        {k: True for k in graph._nodes})

    print('\n'.join(map(str, solution)))

    for op in solution:
        ctx.operation(op)

    ref_dump = Context().install().dump()
    new_dump = ctx.dump()
    assert new_dump == ref_dump


def test_rewind(graph):
    ctx = Context().install()

    operations = graph.operations(install=False, forward=False, uninstall=False, rewind=True)
    solution = resolve(
        operations,
        {k: True for k in graph._nodes},
        {k: k in graph._tails for k in graph._nodes})

    print('\n'.join(map(str, solution)))

    for op in solution:
        ctx.operation(op)

    ref_dump = initial(Context()).dump()
    new_dump = ctx.dump()
    assert new_dump == ref_dump
