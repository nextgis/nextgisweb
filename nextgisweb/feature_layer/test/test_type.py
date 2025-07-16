from pathlib import Path

import pytest
import transaction

from nextgisweb.env import DBSession

from nextgisweb.vector_layer import VectorLayer
from nextgisweb.vector_layer import test as vector_layer_test

from ..numutil import (
    MAX_INT32,
    MAX_INT64,
    MAX_SAFE_INTEGER,
    MIN_INT32,
    MIN_INT64,
    MIN_SAFE_INTEGER,
)

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


@pytest.fixture
def int_layer():
    with transaction.manager:
        layer = VectorLayer(geometry_type="POINT").persist()
        layer.setup_from_fields([dict(keyname="f", datatype="INTEGER")])
        DBSession.flush()
        DBSession.expunge(layer)
    yield layer.id


@pytest.mark.parametrize(
    "value,expected",
    (
        pytest.param(2.6, 3, id="float-round-up"),
        pytest.param(2.4, 2, id="float-round-down"),
        pytest.param(MAX_INT32, MAX_INT32, id="int32-max"),
        pytest.param(MIN_INT32, MIN_INT32, id="int32-min"),
        pytest.param("-42", -42, id="str"),
    ),
)
def test_int_valid(value, expected, bigint_layer, ngw_webtest_app):
    url = f"/api/resource/{bigint_layer}/feature/"
    feature = dict(geom="POINT (0 0)", fields=dict(f=value))
    resp = ngw_webtest_app.post_json(url, feature, status=200)
    fid = resp.json["id"]

    resp = ngw_webtest_app.get(url + str(fid), status=200)
    v = resp.json["fields"]["f"]
    assert type(v) is type(expected)
    assert v == expected


@pytest.mark.parametrize(
    "value",
    (
        pytest.param("qwerty", id="invalid"),
        pytest.param(MAX_INT32 + 1, id="int32-max-overflow"),
        pytest.param(str(MIN_INT32 - 1), id="int32-min-overflow"),
    ),
)
def test_int_invalid(value, int_layer, ngw_webtest_app):
    url = f"/api/resource/{int_layer}/feature/"
    feature = dict(geom="POINT (0 0)", fields=dict(f=value))
    ngw_webtest_app.post_json(url, feature, status=422)


@pytest.fixture
def bigint_layer():
    with transaction.manager:
        layer = VectorLayer(geometry_type="POINT").persist()
        layer.setup_from_fields([dict(keyname="f", datatype="BIGINT")])
        DBSession.flush()
        DBSession.expunge(layer)
    yield layer.id


@pytest.mark.parametrize(
    "value,cases",
    (
        pytest.param(-1.6, {None: -2}, id="float-round-up"),
        pytest.param(-1.4, {None: -1}, id="float-round-down"),
        pytest.param(
            MAX_INT64,
            {"compat": str(MAX_INT64), "string": str(MAX_INT64), "number": MAX_INT64},
            id="int64-max",
        ),
        pytest.param(
            MIN_INT64,
            {"compat": str(MIN_INT64), "string": str(MIN_INT64), "number": MIN_INT64},
            id="int64-min",
        ),
        # Send as string cause of orjson behaviour
        pytest.param(
            MAX_SAFE_INTEGER,
            {
                None: MAX_SAFE_INTEGER,
                "string": str(MAX_SAFE_INTEGER),
                "number": MAX_SAFE_INTEGER,
            },
            id="compat-max-safe",
        ),
        pytest.param(
            MIN_SAFE_INTEGER,
            {
                None: MIN_SAFE_INTEGER,
                "string": str(MIN_SAFE_INTEGER),
                "number": MIN_SAFE_INTEGER,
            },
            id="compat-min-safe",
        ),
        pytest.param(
            MAX_SAFE_INTEGER + 1,
            {
                None: str(MAX_SAFE_INTEGER + 1),
                "string": str(MAX_SAFE_INTEGER + 1),
                "number": MAX_SAFE_INTEGER + 1,
            },
            id="compat-max-unsafe",
        ),
        pytest.param(
            MIN_SAFE_INTEGER - 1,
            {
                None: str(MIN_SAFE_INTEGER - 1),
                "string": str(MIN_SAFE_INTEGER - 1),
                "number": MIN_SAFE_INTEGER - 1,
            },
            id="compat-min-unsafe",
        ),
    ),
)
def test_bigint_valid(value, cases, bigint_layer, ngw_webtest_app):
    url = f"/api/resource/{bigint_layer}/feature/"
    feature = dict(geom="POINT (0 0)", fields=dict(f=value))
    resp = ngw_webtest_app.post_json(url, feature, status=200)
    fid = resp.json["id"]

    for bi_fmt, expected in cases.items():
        q = dict()
        if bi_fmt is not None:
            q["bigint_format"] = bi_fmt
        resp = ngw_webtest_app.get(url + str(fid), q, status=200)
        v = resp.json["fields"]["f"]
        assert type(v) is type(expected)
        assert v == expected


@pytest.mark.parametrize(
    "value",
    (
        pytest.param("qwerty", id="invalid"),
        pytest.param(MAX_INT64 + 1, id="int64-max-overflow"),
        pytest.param(str(MIN_INT64 - 1), id="int64-min-overflow"),
    ),
)
def test_bigint_invalid(value, bigint_layer, ngw_webtest_app):
    url = f"/api/resource/{bigint_layer}/feature/"
    feature = dict(geom="POINT (0 0)", fields=dict(f=value))
    ngw_webtest_app.post_json(url, feature, status=422)
