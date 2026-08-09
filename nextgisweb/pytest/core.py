from collections import defaultdict, deque
from contextlib import contextmanager
from functools import cache
from pathlib import Path
from typing import Any, Type
from unittest.mock import PropertyMock, patch

import pytest
from sqlalchemy import DDL, Table
from sqlalchemy.schema import CreateIndex, CreateTable, SetTableComment

__all__ = [
    "ngw_cleanup",
    "ngw_commit",
    "ngw_core_settings_override",
    "ngw_txn",
    "test_model_ddl",
]


def pytest_addoption(parser):
    parser.addoption(
        "--ngw-preserve",
        action="store_true",
        default=False,
        help="Do not delete objects created during the test session",
    )


@pytest.fixture()
def ngw_txn(ngw_env):
    from transaction import manager

    from nextgisweb.env import DBSession

    with manager as t:
        yield t
        try:
            DBSession.flush()
            t.abort()
        finally:
            DBSession.expunge_all()
            DBSession.expire_all()


@pytest.fixture()
def ngw_commit(ngw_env):
    from transaction import manager

    from nextgisweb.env import DBSession

    try:
        with manager as txn:
            yield txn
            DBSession.flush()
    finally:
        DBSession.expunge_all()
        DBSession.expire_all()


@pytest.fixture()
def ngw_core_settings_override(ngw_env):
    def set_or_delete(comp, name, value):
        if value is None:
            ngw_env.core.settings_delete(comp, name)
        else:
            ngw_env.core.settings_set(comp, name, value)

    @contextmanager
    def wrapped(settings):
        from transaction import manager

        restore = list()

        with manager:
            for comp, name, value in settings:
                try:
                    rvalue = ngw_env.core.settings_get(comp, name)
                except KeyError:
                    rvalue = None
                restore.append((comp, name, rvalue))
                set_or_delete(comp, name, value)

        yield

        with manager:
            for comp, name, rvalue in restore:
                set_or_delete(comp, name, rvalue)

    return wrapped


class CleanupHelper:
    def __init__(self, *, preserve: bool) -> None:
        from sqlalchemy.orm import Session

        self.preserve = preserve
        self.pending: dict[Session, list] = defaultdict(list)
        self.commited: deque[tuple[Type, tuple[Any, ...]]] = deque()
        self.disabled = 0

    def __enter__(self):
        from sqlalchemy import event

        from nextgisweb.env import DBSession

        if not self.preserve:
            event.listen(DBSession, "transient_to_pending", self._transient_to_pending)
            event.listen(DBSession, "after_commit", self._after_commit)

        return self

    def __exit__(self, type, value, traceback):
        from sqlalchemy import event
        from transaction import manager

        from nextgisweb.env import DBSession

        if self.preserve:
            return

        event.remove(DBSession, "transient_to_pending", self._transient_to_pending)
        event.remove(DBSession, "after_commit", self._after_commit)

        remove = self.commited
        reraise = False

        with manager:
            while len(remove) > 0:
                rest = deque()
                for item in remove:
                    cls, pk = item
                    try:
                        with DBSession.begin_nested():
                            if obj := self._get(cls)(pk):
                                DBSession.delete(obj)
                    except Exception as exc:
                        if reraise:
                            raise exc
                        else:
                            rest.append(item)

                reraise = len(rest) == len(remove)
                remove = rest

    @contextmanager
    def disable(self):
        self.disabled += 1
        yield
        self.disabled -= 1

    def _transient_to_pending(self, session, obj):
        if self.disabled == 0:
            self.pending[session].append(obj)

    def _after_commit(self, session):
        from sqlalchemy.orm.util import identity_key

        session_pending = self.pending[session]
        self.commited.extendleft(
            ik[0:2]
            for instance in reversed(session_pending)
            if (ik := identity_key(instance=instance))[1] != (None,)
        )
        session_pending[:] = []

    @cache
    def _get(self, cls):
        from sqlalchemy import inspect
        from sqlalchemy.orm import load_only

        from nextgisweb.env import DBSession

        primary_key = inspect(cls).mapper.primary_key
        options = [load_only(*(getattr(cls, col.key) for col in primary_key))]

        def _get(pk):
            return DBSession.get(cls, pk, options=options)

        return _get


@pytest.fixture(scope="session", autouse=True)
def ngw_cleanup(request):
    preserve = request.config.getoption("--ngw-preserve")
    with CleanupHelper(preserve=preserve) as helper:
        yield helper


@patch.object(Table, "comment", new_callable=PropertyMock, create=True)
def test_model_ddl(mock_table_comment, *, request):
    from nextgisweb.env import Component
    from nextgisweb.env.environment import pkginfo
    from nextgisweb.env.test import Raw, sql_compare

    module = request.module
    cid = pkginfo.component_by_module(module.__name__)

    tables = Component.registry[cid].metadata.tables
    mock_table_comment.return_value = cid

    sql = []
    for t in sorted(tables.values(), key=lambda x: x.name):
        sql.append(Raw(f"/*** Table: {t.name} ***/"))
        sql.append(CreateTable(t))
        sql.append(SetTableComment(t))
        sql.extend(CreateIndex(idx) for idx in sorted(t.indexes, key=lambda x: x.name))

        for listener in t.dispatch.after_create:
            if isinstance(listener, DDL):
                sql.append(listener)
                continue

    sql_file_name = Path(module.__file__).with_suffix(".sql")
    sql_compare(sql, sql_file_name)
