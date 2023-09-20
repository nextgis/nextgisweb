import pytest

# like, expected_extent
expected_extents_list = [
    [
        "1%",
        {
            "minLat": -10,
            "minLon": -10,
            "maxLat": 10,
            "maxLon": 10,
        },
    ],
    [
        "2%",
        {
            "minLat": -20,
            "minLon": -20,
            "maxLat": 20,
            "maxLon": 20,
        },
    ],
    # without filters
    [
        None,
        {
            "minLat": -20,
            "minLon": -20,
            "maxLat": 20,
            "maxLon": 20,
        },
    ],
    # no objects for the filter
    [
        "no-objects",
        {
            "minLat": None,
            "minLon": None,
            "maxLat": None,
            "maxLon": None,
        },
    ],
]


def generate_filter_extents():
    exp_filt_extents = []
    for like, extent in expected_extents_list:
        filter_ = ["string", "like", like]
        if like is None:
            filter_ = None
        exp_filt_extents.append(pytest.param(filter_, extent, id=f"extent {like}"))
    return exp_filt_extents
