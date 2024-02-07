import pytest
import sqlalchemy as sa

from ..model import FileObj


def test_from_content(ngw_txn):
    obj = FileObj(component="test").persist()
    obj.from_content(bytes.fromhex("deadbeef"))

    sa.inspect(obj).session.flush()

    obj = FileObj.filter_by(id=obj.id).one()
    assert obj.filename().read_bytes() == bytes.fromhex("deadbeef")

    with pytest.raises(AssertionError):
        obj.from_content(bytes.fromhex("deadbeef"))


def test_not_written(ngw_txn):
    obj = FileObj(component="test").persist()
    with pytest.raises(AssertionError, match="File not written"):
        sa.inspect(obj).session.flush()
