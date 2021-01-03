# -*- coding: utf-8 -*-
from __future__ import division, unicode_literals, print_function, absolute_import
from datetime import timedelta

import pytest

from nextgisweb.lib.migration.revision import (
    REVID_LENGTH, EPOCH_START, EPOCH_END, revid)


def test_start_end():
    assert revid(EPOCH_START) == '0' * (REVID_LENGTH - 1) + '1'
    assert revid(EPOCH_END) == '1' + '0' * REVID_LENGTH


def test_range():
    with pytest.raises(ValueError):
        revid(EPOCH_START - timedelta.resolution)

    with pytest.raises(ValueError):
        revid(EPOCH_END + timedelta.resolution)


def test_revid():
    v = revid()
    assert len(v) == REVID_LENGTH
    print(v)
