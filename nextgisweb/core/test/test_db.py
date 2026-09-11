import re
from packaging.version import Version
from textwrap import dedent

import pytest
import sqlalchemy as sa

from nextgisweb.env import DBSession

from ..integrity import _toid, check_table


def test_postgres_version(ngw_txn):
    raw = DBSession.execute(sa.text("SHOW server_version")).scalar()
    if m := re.search(r"\d+(?:\.\d){1,}", raw):
        version = Version(m.group(0))
    assert version >= Version("12.0")


def test_postgis_version(ngw_txn):
    version = Version(DBSession.execute(sa.text("SELECT PostGIS_Lib_Version()")).scalar())
    assert version >= Version("3.0.0")


# TODO: module scope
@pytest.fixture
def tables(ngw_txn):
    conn = DBSession.connection()
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
        yield meta, conn
    finally:
        _toid.cache_clear()


@pytest.mark.parametrize(
    "sql, expected",
    (
        (None, None),
        ("ALTER TABLE test_1.test_table_1 ADD COLUMN hellothere integer;", "extra"),
        ("ALTER TABLE test_1.test_table_1 DROP COLUMN value;", "not found"),
        ("ALTER TABLE test_1.test_table_1 ALTER COLUMN value TYPE text;", "type mismatch"),
        (
            "ALTER TABLE test_1.test_table_1 ALTER COLUMN value DROP NOT NULL;",
            "should be nullable",
        ),
        (
            r"ALTER TABLE test_1.test_table_1 ALTER COLUMN value SET DEFAULT 0;",
            "default mismatch",
        ),
        (
            "ALTER TABLE test_1.test_table_1 RENAME CONSTRAINT test_table_1_pkey TO test_table_1_pkey1;",
            "name mismatch",
        ),
        (
            dedent("""
                ALTER TABLE test_1.test_table_1 DROP CONSTRAINT test_table_1_id_check;
                ALTER TABLE test_1.test_table_1 ADD CONSTRAINT test_table_1_id_check CHECK (id != 42);
            """),
            None,
        ),
        (
            dedent("""
                ALTER TABLE test_1.test_table_1 DROP CONSTRAINT test_table_1_id_check;
                ALTER TABLE test_1.test_table_1 ADD CONSTRAINT test_table_1_id_check CHECK (id <> 16);
            """),
            ["not found", "extra constraint found"],
        ),
        (
            "ALTER TABLE test_2.test_table_2 ALTER CONSTRAINT test_table_2_t1_id_fkey DEFERRABLE INITIALLY IMMEDIATE;",
            "should be deferred",
        ),
    ),
)
def test_integrity(
    tables: tuple[sa.MetaData, sa.Connection], sql, expected: None | str | list[str]
):
    meta, conn = tables

    if sql is not None:
        conn.execute(sa.text(sql))

    messages = []

    for tab in meta.tables.values():
        messages.extend(check_table(tab))

    if expected is None:
        assert len(messages) == 0
    elif isinstance(expected, str):
        assert len(messages) == 1
        assert expected in messages[0]
    else:
        assert len(messages) == len(expected)
        for e, m in zip(expected, messages):
            assert e in m
