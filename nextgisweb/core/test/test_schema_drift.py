import pytest
import sqlalchemy as sa

from nextgisweb.env import DBSession

from ..schema_drift import _toid, check_metadata


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
        pytest.param(None, None, id="success"),
        pytest.param(
            "ALTER TABLE test_1.test_table_1 ADD COLUMN hellothere integer;",
            "extra",
            id="extra_column",
        ),
        pytest.param(
            "ALTER TABLE test_1.test_table_1 DROP COLUMN value;",
            "not found",
            id="missing_column",
        ),
        pytest.param(
            "ALTER TABLE test_1.test_table_1 ALTER COLUMN value TYPE text;",
            "type mismatch",
            id="type_mismatch",
        ),
        pytest.param(
            "ALTER TABLE test_1.test_table_1 ALTER COLUMN value DROP NOT NULL;",
            "should be nullable",
            id="nullable",
        ),
        pytest.param(
            "ALTER TABLE test_1.test_table_1 ALTER COLUMN value SET DEFAULT 0;",
            "default mismatch",
            id="default_mismatch",
        ),
        pytest.param(
            "ALTER TABLE test_1.test_table_1 RENAME CONSTRAINT test_table_1_pkey TO test_table_1_pkey1;",
            "name mismatch",
            id="name_mismatch",
        ),
        pytest.param(
            "ALTER TABLE test_1.test_table_1 DROP CONSTRAINT test_table_1_id_check;\n"
            "ALTER TABLE test_1.test_table_1 ADD CONSTRAINT test_table_1_id_check CHECK (id != 42);",
            None,
            id="recreate_check",
        ),
        pytest.param(
            "ALTER TABLE test_1.test_table_1 DROP CONSTRAINT test_table_1_id_check;\n"
            "ALTER TABLE test_1.test_table_1 ADD CONSTRAINT test_table_1_id_check CHECK (id <> 16);",
            ["not found", "extra constraint found"],
            id="check_mismatch",
        ),
        pytest.param(
            "ALTER TABLE test_2.test_table_2 ALTER CONSTRAINT test_table_2_t1_id_fkey DEFERRABLE INITIALLY IMMEDIATE;",
            "should be deferred",
            id="deferrable",
        ),
    ),
)
def test_integrity(
    tables: tuple[sa.MetaData, sa.Connection],
    sql: str | None,
    expected: str | list[str] | None,
):
    meta, conn = tables

    if sql is not None:
        conn.execute(sa.text(sql))

    messages = list(check_metadata(meta, conn))

    if expected is None:
        assert len(messages) == 0
    elif isinstance(expected, str):
        assert len(messages) == 1
        assert expected in messages[0]
    else:
        assert len(messages) == len(expected)
        for e, m in zip(expected, messages):
            assert e in m
