from types import SimpleNamespace

import sqlalchemy as sa

from ..exception import ExternalDatabaseError


def _statement_error(sqlstate):
    orig = SimpleNamespace(diag=SimpleNamespace(sqlstate=sqlstate))
    return sa.exc.StatementError("Simulated error", "SELECT 1", {}, orig)


def test_detail_contains_sqlstate_and_name():
    exc = ExternalDatabaseError(sa_error=_statement_error("23505"))
    assert "PostgreSQL error code: 23505 (UniqueViolation)." in str(exc.detail)


def test_detail_unknown_sqlstate_has_no_name():
    exc = ExternalDatabaseError(sa_error=_statement_error("XX999"))
    assert "PostgreSQL error code: XX999." in str(exc.detail)


def test_detail_without_psycopg_diagnostics():
    sa_error = sa.exc.OperationalError("SELECT 1", {}, SimpleNamespace(diag=None))
    exc = ExternalDatabaseError(sa_error=sa_error)
    assert exc.detail == f"SQLAlchemy error code: {sa_error.code}."
