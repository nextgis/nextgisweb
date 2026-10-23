import json

import pytest
import transaction
from osgeo import gdal, ogr, osr

from nextgisweb.env import DBSession

from nextgisweb.pyramid.test import WebTestApp
from nextgisweb.vector_layer import VectorLayer

pytestmark = pytest.mark.usefixtures("ngw_resource_defaults", "ngw_auth_administrator")


@pytest.fixture(scope="module")
def test_layer_id(feature_layer_filter_dataset):
    return feature_layer_filter_dataset


@pytest.fixture(scope="module")
def layer_with_id_field_id():
    """Vector layer having a field with the 'id' keyname.

    GeoJSON driver is not suitable here, since it uses the 'id' member of
    a feature as a FID. In-memory OGR dataset is used instead.
    """
    driver = gdal.GetDriverByName("MEM")
    dataset = driver.Create("", 0, 0, 0, gdal.GDT_Unknown)
    srs = osr.SpatialReference()
    srs.ImportFromEPSG(3857)
    ogr_layer = dataset.CreateLayer("test", srs=srs, geom_type=ogr.wkbPoint)
    ogr_layer.CreateField(ogr.FieldDefn("id", ogr.OFTInteger))
    for value in (30, 10, 20):
        ogr_feature = ogr.Feature(ogr_layer.GetLayerDefn())
        ogr_feature.SetField("id", value)
        ogr_feature.SetGeometry(ogr.CreateGeometryFromWkt("POINT(0 0)"))
        ogr_layer.CreateFeature(ogr_feature)

    with transaction.manager:
        layer = VectorLayer().persist().from_source(dataset)
        DBSession.flush()
    yield layer.id


def fetch_ids(
    app: WebTestApp,
    layer_id,
    *,
    sort=None,
    order_by=None,
    status=200,
    **extra,
):
    params = dict(extra)
    if sort is not None:
        params["sort"] = sort if isinstance(sort, str) else json.dumps(sort)
    if order_by is not None:
        params["order_by"] = order_by
    resp = app.get(f"/api/resource/{layer_id}/feature/", query=params, status=status)
    if resp.status_int >= 400:
        return resp.json
    return [f["id"] for f in resp.json]


def test_sort_by_fid_desc(ngw_webtest_app: WebTestApp, test_layer_id):
    ids = fetch_ids(ngw_webtest_app, test_layer_id, sort=[["desc", ["fid"]]])
    assert ids == [5, 4, 3, 2, 1]


def test_sort_by_fid_asc(ngw_webtest_app: WebTestApp, test_layer_id):
    ids = fetch_ids(ngw_webtest_app, test_layer_id, sort=[["asc", ["fid"]]])
    assert ids == [1, 2, 3, 4, 5]


def test_sort_by_field_asc(ngw_webtest_app: WebTestApp, test_layer_id):
    ids = fetch_ids(ngw_webtest_app, test_layer_id, sort=[["asc", ["get", "age"]]])
    assert ids == [1, 4, 2, 5, 3]


def test_sort_by_field_named_as_id(ngw_webtest_app: WebTestApp, layer_with_id_field_id):
    ids = fetch_ids(ngw_webtest_app, layer_with_id_field_id, sort=[["asc", ["get", "id"]]])
    assert ids == [2, 3, 1]


def test_sort_by_fid_with_field_named_as_id(ngw_webtest_app: WebTestApp, layer_with_id_field_id):
    ids = fetch_ids(ngw_webtest_app, layer_with_id_field_id, sort=[["asc", ["fid"]]])
    assert ids == [1, 2, 3]


def test_sort_by_field_desc(ngw_webtest_app: WebTestApp, test_layer_id):
    ids = fetch_ids(ngw_webtest_app, test_layer_id, sort=[["desc", ["get", "age"]]])
    assert ids == [3, 5, 2, 4, 1]


def test_sort_multiple_keys(ngw_webtest_app: WebTestApp, test_layer_id):
    sort = [["asc", ["get", "city"]], ["desc", ["fid"]]]
    ids = fetch_ids(ngw_webtest_app, test_layer_id, sort=sort)
    assert ids == [2, 5, 3, 1, 4]


def test_sort_with_filter(ngw_webtest_app: WebTestApp, test_layer_id):
    filter = json.dumps(["==", ["get", "city"], "NYC"])
    ids = fetch_ids(ngw_webtest_app, test_layer_id, sort=[["desc", ["fid"]]], filter=filter)
    assert ids == [5, 3, 1]


def test_sort_with_pagination(ngw_webtest_app: WebTestApp, test_layer_id):
    ids = fetch_ids(ngw_webtest_app, test_layer_id, sort=[["desc", ["fid"]]], limit=2, offset=1)
    assert ids == [4, 3]


def test_sort_empty_expression(ngw_webtest_app: WebTestApp, test_layer_id):
    ids = fetch_ids(ngw_webtest_app, test_layer_id, sort=[])
    assert ids == [1, 2, 3, 4, 5]


def test_sort_raw_json_string(ngw_webtest_app: WebTestApp, test_layer_id):
    ids = fetch_ids(ngw_webtest_app, test_layer_id, sort='[["desc", ["fid"]]]')
    assert ids == [5, 4, 3, 2, 1]


@pytest.mark.parametrize(
    "sort",
    [
        "{",
        '{"dir": "desc"}',
        '["desc"]',
        '[["sideways", ["fid"]]]',
        '[["asc", "name"]]',
        '[["asc", ["==", ["get", "name"], "Alice"]]]',
        '[["asc", ["fid", 1]]]',
        '[["asc", ["get", "nonexistent"]]]',
    ],
)
def test_sort_invalid_expressions(ngw_webtest_app: WebTestApp, test_layer_id, sort):
    body = fetch_ids(ngw_webtest_app, test_layer_id, sort=sort, status=422)
    assert body["status_code"] == 422


def test_sort_conflicts_with_order_by(ngw_webtest_app: WebTestApp, test_layer_id):
    body = fetch_ids(
        ngw_webtest_app,
        test_layer_id,
        sort=[["desc", ["fid"]]],
        order_by="-age",
        status=422,
    )
    assert body["status_code"] == 422
