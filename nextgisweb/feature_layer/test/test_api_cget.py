import json

import pytest
import transaction

from nextgisweb.env import DBSession

from nextgisweb.vector_layer import VectorLayer

pytestmark = pytest.mark.usefixtures("ngw_resource_defaults", "ngw_auth_administrator")

check_list = [
    ["int", [5, 4, 1, 2, 3]],
    # ['+int', [5, 4, 1, 2, 3]], "+" is an unwanted parameter for url str
    ["-int", [3, 1, 2, 4, 5]],
    ["string", [1, 5, 4, 2, 3]],
    ["-string", [2, 3, 4, 5, 1]],
    ["int,-string", [5, 4, 2, 1, 3]],
    ["string,-int", [1, 5, 4, 3, 2]],
    ["-string,-int", [3, 2, 4, 5, 1]],
    # ['unexist', []], Error
]


@pytest.fixture(scope="module")
def vector_layer_id():
    with transaction.manager:
        geojson = {"type": "FeatureCollection", "features": get_features_for_orderby_test()}
        obj = VectorLayer().persist().from_ogr(json.dumps(geojson))
        DBSession.flush()

    yield obj.id


@pytest.mark.parametrize("order_by, check", check_list)
def test_cget_order(ngw_webtest_app, vector_layer_id, order_by, check):
    url_feature = f"/api/resource/{vector_layer_id}/feature/"
    resp = ngw_webtest_app.get(f"{url_feature}?order_by={order_by}")
    ids = [f["id"] for f in resp.json]
    assert ids == check, "order_by=%s" % order_by


def get_features_for_orderby_test():
    params = [
        [1, ""],
        [1, "foo"],
        [2, "foo"],
        [0, "bar"],
        [-3, "BAZ"],
    ]
    features = []
    for num, text in params:
        feature = {
            "type": "Feature",
            "geometry": {"type": "Point", "coordinates": [0.0, 0.0]},
            "properties": {"int": num, "string": text},
            "label": "label",
        }
        features.append(feature)

    return features


def test_cget_extensions(ngw_webtest_app, vector_layer_id):
    url_feature = f"/api/resource/{vector_layer_id}/feature/"
    resp = ngw_webtest_app.get(url_feature)
    assert len(resp.json[0]["extensions"].keys()) > 0

    resp = ngw_webtest_app.get(f"{url_feature}?extensions=")
    assert len(resp.json[0]["extensions"].keys()) == 0

    resp = ngw_webtest_app.get(f"{url_feature}?extensions=description,attachment")
    assert resp.json[0]["extensions"] == dict(description=None, attachment=None)


def test_there_is_no_label_by_default(ngw_webtest_app, vector_layer_id):
    resp = ngw_webtest_app.get(f"/api/resource/{vector_layer_id}/feature/")
    assert "label" not in resp.json[0]


def test_return_label_by_parameter(ngw_webtest_app, vector_layer_id):
    resp = ngw_webtest_app.get(f"/api/resource/{vector_layer_id}/feature/?label=true")
    assert "label" in resp.json[0]
