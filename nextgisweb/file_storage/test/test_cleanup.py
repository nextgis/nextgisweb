import os
import io
from datetime import timedelta

import pytest

from nextgisweb.models import DBSession
from nextgisweb.file_storage import FileObj


@pytest.fixture(scope='module', autouse=True)
def off_keep_interfal(ngw_env):
    value = ngw_env.file_storage.options['cleanup_keep_interval']
    ngw_env.file_storage.options['cleanup_keep_interval'] = timedelta(seconds=-1)
    yield
    ngw_env.file_storage.options['cleanup_keep_interval'] = value


def test_keep_delete(ngw_env, ngw_txn):
    fo_keep = FileObj(component='test').persist()
    fn_keep = ngw_env.file_storage.filename(fo_keep, makedirs=True)

    fo_delete = FileObj(component='test')
    fn_delete = ngw_env.file_storage.filename(fo_delete, makedirs=True)

    DBSession.flush()

    for fn in (fn_keep, fn_delete):
        with io.open(fn, 'w') as fd:
            fd.write(fn)

    ngw_env.file_storage.cleanup()

    assert os.path.isfile(fn_keep)
    assert not os.path.isfile(fn_delete)

    os.unlink(fn_keep)
