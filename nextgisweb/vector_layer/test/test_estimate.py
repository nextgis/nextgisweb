import transaction

from nextgisweb.lib.json import dumps

from ..model import VectorLayer, estimate_vector_layer_data


def test_estimate(ngw_resource_defaults):
    geojson = {
        "type": "FeatureCollection",
        "features": [
            {
                "type": "Feature",
                "properties": {
                    "int": 42,
                    "real": 0.1,
                    "date": "1998-05-15",
                    "time": "09:00:00",
                    "datetime": "2023-01-10T08:30:00",
                    "dynamic": "ninebytes",
                },
                "geometry": None,
            },
            {
                "type": "Feature",
                "properties": {
                    "dynamic": "elevenbytes",
                },
                "geometry": None,
            },
        ],
    }
    static = 4 + 4 + 8 + 4 + 8 + 8
    expected = (static + 9) + (static + 11)

    with transaction.manager:
        res = VectorLayer().persist().from_ogr(dumps(geojson))
        size = estimate_vector_layer_data(res)

    assert size == expected
