from pathlib import Path

import pytest
import transaction

from nextgisweb.env import DBSession

from nextgisweb.vector_layer import VectorLayer
from nextgisweb.vector_layer import test as vector_layer_test

pytestmark = pytest.mark.usefixtures("ngw_resource_defaults", "ngw_auth_administrator")

DATA = Path(vector_layer_test.__file__).parent / "data"


@pytest.fixture
def type_layer():
    with transaction.manager:
        vl_type = VectorLayer().persist().from_ogr(DATA / "type.geojson")
        DBSession.flush()
        DBSession.expunge(vl_type)
    yield vl_type.id


@pytest.mark.parametrize(
    "type,format,value",
    [
        pytest.param("date", "obj", {"year": 2001, "month": 1}),
        pytest.param("date", "obj", {"year": 2002, "month": 2, "day": 31}),
        pytest.param("date", "obj", {"year": 2001, "month": 1, "day": 1, "extra": 1}),
        pytest.param("time", "obj", {"hour": 16, "minute": 20}),
        pytest.param("time", "obj", {"hour": 24, "minute": 0, "second": 0}),
        pytest.param("date", "iso", "2002-02-31"),
        pytest.param("time", "iso", "24:00:00"),
        pytest.param("time", "iso", "00:00:00+01:00"),
        pytest.param("datetime", "iso", "2001-01-01T00:00:00T"),
    ],
)
def test_datetime_invalid(type, format, value, type_layer, ngw_webtest_app):
    api_url = f"/api/resource/{type_layer}/feature/1?dt_format={format}"
    ngw_webtest_app.put_json(api_url, {"fields": {type: value}}, status=422)


date_obj = {"year": 2001, "month": 1, "day": 1}
time_obj = {"hour": 16, "minute": 20, "second": 0}


@pytest.mark.parametrize(
    "type,format,value",
    [
        pytest.param("date", "obj", date_obj),
        pytest.param("time", "obj", time_obj),
        pytest.param("datetime", "obj", {**date_obj, **time_obj}),
        pytest.param("date", "iso", "2001-01-01"),
        pytest.param("time", "iso", "16:20:00"),
        pytest.param("datetime", "iso", "2001-01-01T16:20:00"),
    ],
)
def test_datetime_valid(type, format, value, type_layer, ngw_webtest_app):
    api_url = f"/api/resource/{type_layer}/feature/1?dt_format={format}"
    ngw_webtest_app.put_json(api_url, {"fields": {type: value}}, status=200)
    resp = ngw_webtest_app.get(api_url, status=200)
    assert resp.json["fields"][type] == value
