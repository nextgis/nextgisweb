from datetime import timedelta

import pytest

from ..revision import EPOCH_END, EPOCH_START, REVID_LENGTH, revid


def test_start_end():
    assert revid(EPOCH_START) == "0" * (REVID_LENGTH - 1) + "1"
    assert revid(EPOCH_END) == "1" + "0" * REVID_LENGTH


def test_range():
    with pytest.raises(ValueError):
        revid(EPOCH_START - timedelta.resolution)

    with pytest.raises(ValueError):
        revid(EPOCH_END + timedelta.resolution)


def test_revid():
    v = revid()
    assert len(v) == REVID_LENGTH
    print(v)
