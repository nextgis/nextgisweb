# -*- coding: utf-8 -*-
from __future__ import division, absolute_import, print_function, unicode_literals

from nextgisweb.core.backup import (
    IndexFile,
    IndexRecord,
    backup,
)


def test_index_file_read_write(tmp_path):
    ifile = IndexFile(unicode(tmp_path / 'index'))

    data = [
        IndexRecord(1, 'none-value', None),
        IndexRecord(2, 'zero-byte', '\x00'),
        IndexRecord(3, 'complex', dict(int=1, str='str')),
    ]

    with ifile.writer() as write:
        for sample in data:
            write(sample)

    with ifile.reader() as read:
        assert list(read) == data


def test_dummy_backup(env, tmp_path):
    backup(env, unicode(tmp_path))
