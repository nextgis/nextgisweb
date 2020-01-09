# -*- coding: utf-8 -*-
from __future__ import division, absolute_import, print_function, unicode_literals
import os
import io

from nextgisweb.models import DBSession
from nextgisweb.file_storage import FileObj


def test_keep_delete(env, txn):
    fo_keep = FileObj(component='test').persist()
    fn_keep = env.file_storage.filename(fo_keep, makedirs=True)

    fo_delete = FileObj(component='test')
    fn_delete = env.file_storage.filename(fo_delete, makedirs=True)

    DBSession.flush()

    for fn in (fn_keep, fn_delete):
        with io.open(fn, 'w') as fd:
            fd.write(fn)

    env.file_storage.cleanup()

    assert os.path.isfile(fn_keep)
    assert not os.path.isfile(fn_delete)

    os.unlink(fn_keep)
