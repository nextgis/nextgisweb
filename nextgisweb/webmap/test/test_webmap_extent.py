import pytest

from ..api import add_extent

check_extents = [
    [
        dict(minLon=100, maxLon=150, minLat=50, maxLat=90),
        dict(minLon=90, maxLon=160, minLat=40, maxLat=95),
        dict(minLon=90, maxLon=160, minLat=40, maxLat=95),
    ],
    [
        dict(minLon=100, maxLon=150, minLat=50, maxLat=90),
        dict(minLon=None, maxLon=160, minLat=40, maxLat=95),
        dict(minLon=100, maxLon=150, minLat=50, maxLat=90),
    ],
    [
        dict(minLon=None, maxLon=150, minLat=50, maxLat=90),
        dict(minLon=None, maxLon=160, minLat=40, maxLat=95),
        None,
    ],
    [
        dict(minLon=100, maxLon=150, minLat=50, maxLat=90),
        None,
        dict(minLon=100, maxLon=150, minLat=50, maxLat=90),
    ],
    [
        None,
        None,
        None,
    ],
    [
        dict(minLon=100, maxLon=150, minLat=50, maxLat=90),
        dict(minLon=-90, maxLon=120, minLat=-40, maxLat=70),
        dict(minLon=-90, maxLon=150, minLat=-40, maxLat=90),
    ],
]


@pytest.mark.parametrize("e1, e2, expected", check_extents)
def test_add_extent(e1, e2, expected):
    actual = add_extent(e1, e2)
    assert actual == expected
    actual = add_extent(e2, e1)
    assert actual == expected
