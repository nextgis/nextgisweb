import re
from packaging.version import Version

import pytest
from sqlalchemy import text

from nextgisweb.env import DBSession

from ..integrity import check_table


def test_postgres_version(ngw_txn):
    raw = DBSession.execute(text("SHOW server_version")).scalar()
    if m := re.search(r"\d+(?:\.\d){1,}", raw):
        version = Version(m.group(0))
    assert version >= Version("12.0")


def test_postgis_version(ngw_txn):
    version = Version(DBSession.execute(text("SELECT PostGIS_Lib_Version()")).scalar())
    assert version >= Version("3.0.0")


@pytest.mark.parametrize(
    "sql, expected",
    (
        (None, None),
        ("ALTER TABLE setting ADD COLUMN hellothere integer;", "extra"),
        ("ALTER TABLE setting DROP COLUMN value;", "not found"),
        ("ALTER TABLE setting ALTER COLUMN value TYPE text;", "type mismatch"),
        ("ALTER TABLE setting ALTER COLUMN value DROP NOT NULL;", "should be nullable"),
        (r"ALTER TABLE setting ALTER COLUMN value SET DEFAULT '{}';", "default mismatch"),
    ),
)
def test_integrity(sql, expected, ngw_env, ngw_txn):
    metadata = ngw_env.metadata()
    tab = metadata.tables["setting"]

    if sql is not None:
        DBSession.execute(text(sql))

    messages = list(check_table(tab))
    if expected is None:
        assert len(messages) == 0
    else:
        assert len(messages) == 1
        assert expected in messages[0]
