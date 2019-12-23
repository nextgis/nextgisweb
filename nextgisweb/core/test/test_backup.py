# -*- coding: utf-8 -*-
from __future__ import division, absolute_import, print_function, unicode_literals
from distutils.version import LooseVersion

import pytest

from nextgisweb.core.backup import (
    IndexFile,
    IndexRecord,
    parse_pg_dump_version,
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


@pytest.mark.parametrize('output, expected', [
    ('pg_dump (PostgreSQL) 10.10 (Ubuntu 10.10-0ubuntu0.18.04.1)', '10.10'),
    ('pg_dump (PostgreSQL) 9.3.22', '9.3.22'),
])
def test_parse_pg_dump_version(output, expected):
    assert parse_pg_dump_version(output) == LooseVersion(expected)


def test_dummy_backup(env, tmp_path):
    backup(env, unicode(tmp_path))
