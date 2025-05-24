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


@pytest.mark.parametrize(
    "wet",
    [
        pytest.param(True, id="wet"),
        pytest.param(False, id="dry"),
    ],
)
@pytest.mark.parametrize(
    "kwargs, unref, orphan",
    [
        pytest.param(dict(), False, False, id="default"),
        pytest.param(dict(unreferenced=True, orphaned=True), False, False, id="force"),
        pytest.param(dict(unreferenced=False, orphaned=False), True, True, id="disable"),
    ],
)
def test_cleanup(wet, kwargs, unref, orphan, ngw_env, ngw_txn):
    fobj_unref = FileObj(component="test").from_content(b"").persist()
    fobj_orphan = FileObj(component="test").from_content(b"")

    assert fobj_unref.filename().is_file()
    assert fobj_orphan.filename().is_file()

    DBSession.flush()

    ngw_env.file_storage.cleanup(**kwargs, dry_run=not wet)

    fe_unref = fobj_unref.filename().is_file()
    fe_orphan = fobj_orphan.filename().is_file()

    if wet:
        assert fe_unref == unref
        assert fe_orphan == orphan
    else:
        assert fe_unref and fe_orphan
