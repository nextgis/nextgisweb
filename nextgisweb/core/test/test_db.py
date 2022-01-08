from distutils.version import LooseVersion

from sqlalchemy import text

from nextgisweb.models import DBSession


def test_postgres_version(ngw_txn):
    """ Useless PostgreSQL version check """

    version = LooseVersion(DBSession.execute(
        text('SHOW server_version')).scalar())
    assert version >= LooseVersion('9.3')


def test_postgis_version(ngw_txn):
    """ Useless PostgreGIS version check """

    version = LooseVersion(DBSession.execute(
        text('SELECT PostGIS_Lib_Version()')).scalar())
    assert version >= LooseVersion('2.1.2')
