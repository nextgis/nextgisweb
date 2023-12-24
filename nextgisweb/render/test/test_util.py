from ..util import scale_range_intersection


def test_scale_range_intersection():
    sri = scale_range_intersection
    assert sri((None, None), (None, None)) == (None, None)
    assert sri((100_000, None), (None, 10_000)) == (100_000, 10_000)
    assert sri((100_000, 10_000), (200_000, 20_000)) == (100_000, 20_000)
