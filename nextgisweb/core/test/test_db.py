import re
from packaging.version import Version

import sqlalchemy as sa

from nextgisweb.env import DBSession


def test_postgres_version(ngw_txn):
    raw = DBSession.execute(sa.text("SHOW server_version")).scalar()
    if m := re.search(r"\d+(?:\.\d){1,}", raw):
        version = Version(m.group(0))
    assert version >= Version("12.0")


def test_postgis_version(ngw_txn):
    version = Version(DBSession.execute(sa.text("SELECT PostGIS_Lib_Version()")).scalar())
    assert version >= Version("3.0.0")
