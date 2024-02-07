from datetime import timedelta

import pytest

from nextgisweb.env import DBSession

from nextgisweb.file_storage import FileObj


@pytest.fixture(scope="module", autouse=True)
def off_keep_interfal(ngw_env):
    value = ngw_env.file_storage.options["cleanup_keep_interval"]
    ngw_env.file_storage.options["cleanup_keep_interval"] = timedelta(seconds=-1)
    yield
    ngw_env.file_storage.options["cleanup_keep_interval"] = value


def test_keep_delete(ngw_env, ngw_txn):
    fobj_keep = FileObj(component="test").from_content(b"").persist()
    fobj_delete = FileObj(component="test").from_content(b"")

    DBSession.flush()

    ngw_env.file_storage.cleanup(dry_run=False)

    assert fobj_keep.filename().is_file()
    assert not fobj_delete.filename().is_file()
