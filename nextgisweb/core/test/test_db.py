import re

from packaging.version import Version
from sqlalchemy import text

from nextgisweb.models import DBSession


def test_postgres_version(ngw_txn):
    """ Useless PostgreSQL version check """

    raw = DBSession.execute(text('SHOW server_version')).scalar()
    if m := re.search(r'\d+(?:\.\d){1,}', raw):
        version = Version(m.group(0))
    assert version >= Version('10.0')


def test_postgis_version(ngw_txn):
    """ Useless PostgreGIS version check """

    version = Version(DBSession.execute(
        text('SELECT PostGIS_Lib_Version()')).scalar())
    assert version >= Version('2.5.0')
