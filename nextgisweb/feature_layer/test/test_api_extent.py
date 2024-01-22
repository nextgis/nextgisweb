import json

import pytest
import transaction
from osgeo import ogr

from nextgisweb.env import DBSession

from nextgisweb.postgis.test import create_feature_layer as create_postgis_layer
from nextgisweb.vector_layer import VectorLayer
from nextgisweb.vector_layer.test import create_feature_layer as create_vector_layer

from .data import generate_filter_extents

pytestmark = pytest.mark.usefixtures("ngw_resource_defaults", "ngw_auth_administrator")

filter_extents_data = generate_filter_extents()


@pytest.fixture(scope="module")
def vector_layer_id():
    with transaction.manager:
        geojson = {
            "type": "FeatureCollection",
            "name": "polygon_extent",
            "crs": {"type": "name", "properties": {"name": "urn:ogc:def:crs:EPSG::3857"}},
            "features": [
                {
                    "type": "Feature",
                    "properties": {"name": "west"},
                    "geometry": {
                        "type": "Polygon",
                        "coordinates": [
                            [
                                [5542180, 8799167],
                                [6191082, 7551279],
                                [4668659, 7126998],
                                [5542180, 8799167],
                            ]
                        ],
                    },
                },
                {
                    "type": "Feature",
                    "properties": {"name": "east"},
                    "geometry": {
                        "type": "Polygon",
                        "coordinates": [
                            [
                                [15100999, 10396463],
                                [16498633, 10546209],
                                [16673337, 9223449],
                                [15175872, 8948913],
                                [15100999, 10396463],
                            ]
                        ],
                    },
                },
            ],
        }

        obj = VectorLayer().persist().from_ogr(json.dumps(geojson))
        DBSession.flush()

    yield obj.id


item_one_extent = {
    "minLat": 53.7714928132034,
    "maxLat": 61.7460098580695,
    "minLon": 41.9392773604216,
    "maxLon": 55.6154358583725,
}

item_two_extent = {
    "minLat": 62.3762455754066,
    "maxLat": 68.3314641781765,
    "minLon": 135.654582071736,
    "maxLon": 149.779134643755,
}

item_check_list = [[1, item_one_extent], [2, item_two_extent]]


@pytest.mark.parametrize("fid, extent", item_check_list)
def test_item_extent(ngw_webtest_app, vector_layer_id, extent, fid):
    req_str = "/api/resource/%d/feature/%d/extent" % (vector_layer_id, fid)
    resp = ngw_webtest_app.get(req_str)
    for coord, value in resp.json["extent"].items():
        assert extent.pop(coord) == pytest.approx(value, 1e-8)
    assert len(extent) == 0


@pytest.mark.parametrize(
    "create_resource",
    (
        pytest.param(create_vector_layer, id="vector_layer"),
        pytest.param(create_postgis_layer, id="postgis_layer"),
    ),
)
@pytest.mark.parametrize("filter_, expected_extent", filter_extents_data)
def test_filtered_extent(
    create_resource,
    filter_,
    expected_extent,
    ngw_resource_group_sub,
    ngw_httptest_app,
    ngw_webtest_app,
    ngw_data_path,
):
    data = ngw_data_path / "filter-extent-layer.geojson"

    ds = ogr.Open(str(data))
    ogrlayer = ds.GetLayer(0)

    with create_resource(
        ogrlayer,
        ngw_resource_group_sub,
        ngw_httptest_app=ngw_httptest_app,
    ) as layer:
        query_filter = ""
        if filter_ is not None:
            t, op, v = filter_
            like_v = v.replace("%", "")
            query_filter = f"?like={like_v}"

        req_str = f"/api/resource/{layer.id}/feature_extent{query_filter}"

        resp = ngw_webtest_app.get(req_str)
        actual_extent = resp.json["extent"]

        for k in ("minLat", "maxLat", "minLon", "maxLon"):
            if expected_extent[k] is None:
                assert actual_extent[k] is None
            else:
                assert abs(expected_extent[k] - actual_extent[k]) < 1e-6
