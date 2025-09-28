import pytest

from nextgisweb.spatial_ref_sys import SRS

from ..util import image_zoom, scale_range_intersection


def test_scale_range_intersection():
    sri = scale_range_intersection
    assert sri((None, None), (None, None)) == (None, None)
    assert sri((100_000, None), (None, 10_000)) == (100_000, 10_000)
    assert sri((100_000, 10_000), (200_000, 20_000)) == (100_000, 20_000)


@pytest.mark.parametrize(
    "extent, size, expected",
    (
        ((0, 0, 1300, 1300), (256, 256), None),
        ((0, 0, 1223, 1200), (256, 256), None),
        ((0, 0, 1223, 1223), (256, 256), 15),
    ),
)
def test_image_zoom(extent, size, expected, ngw_txn):
    srs = SRS.filter_by(id=3857).one()
    zoom = image_zoom(extent, size, srs)
    assert zoom == expected
