import json
from itertools import product
from unittest.mock import ANY

import pytest
import transaction
from mapbox_vector_tile import decode as mvt_decode

from nextgisweb.env import DBSession
from nextgisweb.lib.geometry import Geometry

from nextgisweb.feature_layer.ogrdriver import OGR_DRIVER_NAME_2_EXPORT_FORMATS
from nextgisweb.pyramid.test import WebTestApp
from nextgisweb.resource.test import ResourceAPI
from nextgisweb.vector_layer import VectorLayer

from . import FeatureLayerAPI

pytestmark = pytest.mark.usefixtures("ngw_resource_defaults", "ngw_auth_administrator")

ZXY0 = {"z": 0, "x": 0, "y": 0}


def test_identify(ngw_webtest_app: WebTestApp):
    data = {"srs": 3857, "geom": "POLYGON((0 0,0 1,1 1,1 0,0 0))", "layers": []}
    resp = ngw_webtest_app.post("/api/feature_layer/identify", json=data, status=200)
    assert resp.json["featureCount"] == 0


@pytest.fixture()
def vector_layer_id():
    with transaction.manager:
        geojson = {
            "type": "FeatureCollection",
            "crs": {"type": "name", "properties": {"name": "urn:ogc:def:crs:EPSG::3857"}},
            "features": [
                {
                    "type": "Feature",
                    "properties": {"price": -1, "name": "feature1"},
                    "geometry": {"type": "Point", "coordinates": [0, 0]},
                },
                {
                    "type": "Feature",
                    "properties": {"price": -2, "name": "feature2"},
                    "geometry": {"type": "Point", "coordinates": [0, 0]},
                },
            ],
        }

        obj = VectorLayer().persist().from_ogr(json.dumps(geojson))
        DBSession.flush()

    yield obj.id


def test_fields_edit(vector_layer_id, ngw_webtest_app: WebTestApp):
    lapi = ngw_webtest_app.with_url(f"/api/resource/{vector_layer_id}")
    fapi = ngw_webtest_app.with_url(f"/api/resource/{vector_layer_id}/feature/1")

    fields = lapi.get().json["feature_layer"]["fields"]
    assert len(fields) == 2
    assert fields[0]["keyname"] == "price"
    assert fields[1]["keyname"] == "name"

    feature_fields = fapi.get().json["fields"]
    assert len(feature_fields) == 2

    fields.append(
        {
            "keyname": "new_field",
            "datatype": "DATETIME",
            "typemod": None,
            "display_name": "new_field",
            "label_field": False,
            "grid_visibility": True,
            "text_search": True,
        }
    )
    lapi.put(json={"feature_layer": {"fields": fields}}, status=200)

    feature_fields = fapi.get().json["fields"]
    assert len(feature_fields) == 3

    fields = lapi.get().json["feature_layer"]["fields"]
    assert len(fields) == 3
    assert fields[0]["keyname"] == "price"
    assert fields[1]["keyname"] == "name"
    assert fields[2]["keyname"] == "new_field"

    fields = [fields[2], fields[0]]
    lapi.put(json={"feature_layer": {"fields": fields}}, status=200)

    fields = lapi.get().json["feature_layer"]["fields"]
    assert len(fields) == 3
    assert fields[0]["keyname"] == "name"
    assert fields[1]["keyname"] == "new_field"
    assert fields[2]["keyname"] == "price"
    lapi.put(json={"feature_layer": {"fields": fields}}, status=200)

    resp = lapi.get()
    fields = resp.json["feature_layer"]["fields"]
    assert len(fields) == 2
    assert fields[0]["keyname"] == "name"
    assert fields[1]["keyname"] == "price"

    lapi.put(
        json={
            "feature_layer": {
                "fields": [
                    {"keyname": "new_field2", "datatype": "STRING", "display_name": "new_field2"}
                ]
            }
        },
        status=200,
    )

    fields = lapi.get().json["feature_layer"]["fields"]
    assert len(fields) == 3
    assert fields[0]["keyname"] == "name"
    assert fields[1]["keyname"] == "price"
    assert fields[2]["keyname"] == "new_field2"

    lapi.put(
        json={"feature_layer": {"fields": [{"id": fld["id"], "delete": True} for fld in fields]}},
        status=200,
    )

    fields = lapi.get().json["feature_layer"]["fields"]
    assert len(fields) == 0

    lapi.put(
        json={
            "feature_layer": {
                "fields": [
                    {"keyname": "new_field3", "datatype": "STRING", "display_name": "new_field3"}
                ]
            }
        },
        status=200,
    )

    fields = lapi.get().json["feature_layer"]["fields"]
    assert len(fields) == 1
    assert fields[0]["keyname"] == "new_field3"


def test_geom_edit(ngw_webtest_app: WebTestApp, vector_layer_id):
    def wkt_compare(wkt1, wkt2):
        g1 = Geometry.from_wkt(wkt1)
        g2 = Geometry.from_wkt(wkt2)
        return g1.shape.equals(g2.shape)

    feature_url = "/api/resource/%d/feature/1" % vector_layer_id

    feature = ngw_webtest_app.get(feature_url).json
    assert wkt_compare(feature["geom"], "POINT (0.0 0.0)")

    feature = ngw_webtest_app.get(feature_url + "?geom_format=geojson").json
    assert feature["geom"] == {"type": "Point", "coordinates": [0.0, 0.0]}

    feature["geom"] = "POINT (1 0)"
    ngw_webtest_app.put(feature_url, json=feature)
    feature = ngw_webtest_app.get(feature_url).json
    assert wkt_compare(feature["geom"], "POINT (1.0 0.0)")

    feature["geom"] = {"type": "Point", "coordinates": [1, 2]}
    ngw_webtest_app.put(feature_url + "?geom_format=geojson", json=feature)
    assert feature == ngw_webtest_app.get(feature_url + "?geom_format=geojson").json

    feature = ngw_webtest_app.get(feature_url).json
    assert wkt_compare(feature["geom"], "POINT (1.0 2.0)")

    feature["geom"] = {"type": "Point", "coordinates": [90, 45]}
    ngw_webtest_app.put(feature_url + "?geom_format=geojson&srs=4326", json=feature)
    feature = ngw_webtest_app.get(feature_url + "?geom_format=geojson&srs=3857").json
    coords = feature["geom"]["coordinates"]
    assert round(coords[0], 3) == 10018754.171
    assert round(coords[1], 3) == 5621521.486


def test_cpatch(ngw_webtest_app: WebTestApp, vector_layer_id):
    fapi = FeatureLayerAPI(vector_layer_id)
    result = fapi.cpatch(
        [
            {"id": 1, "geom": None, "fields": {"price": None}},
            {"id": 2, "delete": True},
            {"geom": "POINT (1 1)", "fields": {"price": 0}},
        ],
        query={"geom_null": True},
    )

    assert result == [{"id": 1}, {"id": 2}, {"id": 3}]

    assert fapi.feature_list() == [
        {"id": 1, "geom": None, "fields": {"price": None, "name": ANY}},
        {"id": 3, "geom": "POINT(1 1)", "fields": {"price": 0, "name": ANY}},
    ]


def test_fields_unique():
    rapi = ResourceAPI()

    fields = [
        {"keyname": "keyname1", "display_name": "display_name1", "datatype": "STRING"},
        {"keyname": "keyname1", "display_name": "display_name2", "datatype": "STRING"},
    ]

    payload = {
        "vector_layer": {
            "srs": {"id": 3857},
            "geometry_type": "POINT",
            "fields": fields,
        },
    }

    rapi.create_request("vector_layer", payload, status=422)

    fields[1]["keyname"] = "keyname2"
    fields[1]["display_name"] = "display_name1"
    rapi.create_request("vector_layer", payload, status=422)

    fields[1]["display_name"] = "display_name2"
    layer_id = rapi.create("vector_layer", payload)

    fields = rapi.read(layer_id)["feature_layer"]["fields"]
    body_update = {"feature_layer": {"fields": fields}}

    assert fields[1]["display_name"] == "display_name2"

    fields[1]["display_name"] = "display_name1"
    rapi.update_request(layer_id, body_update, status=422)

    fields[1]["display_name"] = "display_name2"
    rapi.update_request(layer_id, body_update, status=200)

    rapi.delete(layer_id)


@pytest.mark.parametrize(
    "fmt, zipped, srs",
    product(
        [f["name"] for f in OGR_DRIVER_NAME_2_EXPORT_FORMATS],
        ("true", "false"),
        (4326, 3857),
    ),
)
def test_export(fmt, zipped, srs, ngw_webtest_app: WebTestApp, vector_layer_id):
    ngw_webtest_app.get(

@pytest.mark.parametrize(
    "native, driver, status_expected",
    (
        (False, True, 200),
        (False, False, 404),
        (True, False, 200),
    ),
)
def test_mvt_encoder_not_available(
    native,
    driver,
    status_expected,
    ngw_env,
    ngw_webtest_app: WebTestApp,
    vector_layer_id,
    monkeypatch,
):
    from .. import api_mvt

    if (native and not NATIVE_MVT) or (driver and not MVT_DRIVER_EXIST):
        pytest.skip("MVT encoder is not available")

    monkeypatch.setattr(ngw_env.feature_layer, "mvt_native", native)
    monkeypatch.setattr(api_mvt, "MVT_DRIVER_EXIST", driver)

    resp = _mvt_get(ngw_webtest_app, resource=vector_layer_id, status=status_expected)
    if status_expected == 200:
        assert len(mvt_decode(resp.body)[f"ngw:{vector_layer_id}"]["features"]) == 2


def test_filter(ngw_webtest_app: WebTestApp, vector_layer_id):
    url_feature = f"/api/resource/{vector_layer_id}/feature/"

    resp = ngw_webtest_app.get(url_feature, query={"fld_price__ge": -1}, status=200)
    assert len(resp.json) == 1
    assert resp.json[0]["fields"]["price"] == -1

    ngw_webtest_app.get(url_feature, query={"fld_not_exists": "no matter"}, status=422)

    # The 'startswith' operator is not supported in the new filter format
    ngw_webtest_app.get(url_feature, query={"fld_price__startswith": 1}, status=422)


def test_feature_delete(ngw_webtest_app: WebTestApp, vector_layer_id):
    url_feature = f"/api/resource/{vector_layer_id}/feature/"

    resp = ngw_webtest_app.delete(url_feature, json=[])
    assert resp.json == []

    resp = ngw_webtest_app.delete(url_feature, json=[{"id": 1}])
    assert resp.json == [1]

    resp = ngw_webtest_app.delete(url_feature)
    assert resp.json

    assert ngw_webtest_app.get(url_feature).json == []


@pytest.fixture
def _fields_order_layer():
    with transaction.manager:
        layer = VectorLayer(geometry_type="NONE").persist()
        layer.setup_from_fields(
            [
                {"keyname": "field0", "datatype": "STRING"},
                {"keyname": "field1", "datatype": "STRING"},
                {"keyname": "field2", "datatype": "STRING"},
            ]
        )
        layer.feature_label_field = layer.fields[0]
    yield layer.id


@pytest.mark.parametrize(
    "indexes_change",
    ([0], [0, 1], [0, 2], [1, 2]),
)
def test_fields_order(indexes_change, ngw_webtest_app: WebTestApp, _fields_order_layer):
    api = ngw_webtest_app.with_url(f"/api/resource/{_fields_order_layer}")

    resp = api.get(status=200)
    fields = resp.json["feature_layer"]["fields"]

    fields_new = [
        {"id": fields[idx]["id"], "display_name": f"change {idx}"} for idx in indexes_change
    ]
    data = {"feature_layer": {"fields": fields_new}}
    api.put(json=data, status=200)

    resp = api.get(status=200)
    for i, fld in enumerate(resp.json["feature_layer"]["fields"]):
        assert fld["label_field"] == (fld["keyname"] == "field0")
        assert fld["keyname"] == f"field{i}"
