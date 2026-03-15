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


def test_size_calc(ngw_txn):
    obj = FileObj(component="test").persist()
    fn = obj.filename(makedirs=True, not_exists=True)
    with open(fn, "wb") as fd:
        fd.write(b"1234")

    sa.inspect(obj).session.flush()

    assert obj.size == 4


@pytest.fixture
def fobj(ngw_txn):
    obj = FileObj(component="test").from_content(b"test").persist()
    yield obj
    sa.inspect(obj).session.delete(obj)


@pytest.mark.parametrize("value", (dict(some="meta"), None))
def test_meta(fobj, value):
    fobj.meta = value

    sa.inspect(fobj).session.flush()

    fobj_fresh = FileObj.filter_by(id=fobj.id).one()
    assert fobj_fresh.meta == value
