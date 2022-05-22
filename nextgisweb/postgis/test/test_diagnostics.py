import pytest

from ..diagnostics import Checker, PostgresCheck, SUCCESS, ERROR


@pytest.fixture(scope="module")
def con_args(ngw_env):
    src = ngw_env.core._db_connection_args()
    return dict(
        hostname=src['host'], port=src['port'], database=src['database'],
        username=src['username'], password=src['password'])


def test_postgres_check(con_args):
    ck = PostgresCheck(**con_args)
    ck.check()
    assert ck.status == SUCCESS


def test_connection(con_args):
    checker = Checker(connection=con_args)
    assert checker.status == SUCCESS


def test_unresolvable_hostname(con_args):
    con_args = dict(con_args, hostname="?")
    checker = Checker(connection=con_args)
    assert checker.status == ERROR


def test_invalid_credentials(con_args):
    con_args = dict(con_args, username='invalid')
    checker = Checker(connection=con_args)
    assert checker.status == ERROR
