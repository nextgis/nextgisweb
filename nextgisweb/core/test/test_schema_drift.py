from contextlib import contextmanager

import pytest
import sqlalchemy as sa

from nextgisweb.env import DBSession

from ..schema_drift import _toid, check_table


@contextmanager
def tables(conn):
    meta = sa.MetaData()
    t1 = sa.Table(
        "test_table_1",
        meta,
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("value", sa.Float, nullable=False),
        sa.CheckConstraint("id <> 42"),
        schema="test_1",
    )
    sa.Table(
        "test_table_2",
        meta,
        sa.Column(
            "t1_id",
            sa.Integer,
            sa.ForeignKey(t1.c.id, deferrable=True, initially="DEFERRED"),
        ),
        schema="test_2",
    )
    for schema in set(t.schema for t in meta.tables.values() if t.schema is not None):
        conn.execute(sa.schema.CreateSchema(schema))
    meta.create_all(conn)

    try:
        yield meta
    finally:
        _toid.cache_clear()


@contextmanager
def table_not_created(conn):
    meta = sa.MetaData()
    sa.Table("test_table", meta, sa.Column("value", sa.Integer))
    yield meta


def _generate():
    yield pytest.param(table_not_created, None, "not exists", id="missing_table")

    for sql, expected, id_ in (
        (None, None, "success"),
        (
            "ALTER TABLE test_1.test_table_1 ADD COLUMN hellothere integer;",
            "extra",
            "extra_column",
        ),
        (
            "ALTER TABLE test_1.test_table_1 DROP COLUMN value;",
            "not found",
            "missing_column",
        ),
        (
            "ALTER TABLE test_1.test_table_1 ALTER COLUMN value TYPE text;",
            "type mismatch",
            "type_mismatch",
        ),
        (
            "ALTER TABLE test_1.test_table_1 ALTER COLUMN value DROP NOT NULL;",
            "should be nullable",
            "nullable",
        ),
        (
            "ALTER TABLE test_1.test_table_1 ALTER COLUMN value SET DEFAULT 0;",
            "default mismatch",
            "default_mismatch",
        ),
        (
            "ALTER TABLE test_1.test_table_1 RENAME CONSTRAINT test_table_1_pkey TO test_table_1_pkey1;",
            "name mismatch",
            "name_mismatch",
        ),
        (
            "ALTER TABLE test_1.test_table_1 DROP CONSTRAINT test_table_1_id_check;\n"
            "ALTER TABLE test_1.test_table_1 ADD CONSTRAINT test_table_1_id_check CHECK (id != 42);",
            None,
            "recreate_check",
        ),
        (
            "ALTER TABLE test_1.test_table_1 DROP CONSTRAINT test_table_1_id_check;\n"
            "ALTER TABLE test_1.test_table_1 ADD CONSTRAINT test_table_1_id_check CHECK (id <> 16);",
            ["not found", "extra constraint found"],
            "check_mismatch",
        ),
        (
            "ALTER TABLE test_2.test_table_2 ALTER CONSTRAINT test_table_2_t1_id_fkey DEFERRABLE INITIALLY IMMEDIATE;",
            "should be deferred",
            "deferrable",
        ),
    ):
        yield pytest.param(tables, sql, expected, id=id_)


@pytest.mark.parametrize("setup, sql, expected", _generate())
def test_integrity(
    setup,
    sql: str | None,
    expected: str | list[str] | None,
    ngw_txn,
):
    conn = DBSession.connection()
    with setup(conn) as meta:
        if sql is not None:
            conn.execute(sa.text(sql))

        messages = []
        for tab in meta.tables.values():
            messages.extend(check_table(tab, conn))

        if expected is None:
            assert len(messages) == 0
        elif isinstance(expected, str):
            assert len(messages) == 1
            assert expected in messages[0]
        else:
            assert len(messages) == len(expected)
            for e, m in zip(expected, messages):
                assert e in m
