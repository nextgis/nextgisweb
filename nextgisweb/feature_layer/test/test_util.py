import pytest

from ..util import unique_name


@pytest.mark.parametrize(
    "name,collection,expected",
    (
        ("name", (), "name"),
        ("fid", ("fid", "fid_1", "fid_2"), "fid_3"),
        ("fid", ("fid_1",), "fid"),
        ("fid_1", ("fid_1",), "fid_2"),
    ),
)
def test_unique_gen(name, collection, expected):
    assert unique_name(name, collection) == expected
