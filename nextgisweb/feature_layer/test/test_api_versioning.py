import itertools

import pytest
import transaction

from nextgisweb.pyramid.test import WebTestApp
from nextgisweb.vector_layer.model import VectorLayer, VectorLayerField

pytestmark = pytest.mark.usefixtures("ngw_resource_defaults", "ngw_auth_administrator")


@pytest.fixture(scope="module")
def res():
    with transaction.manager:
        obj = VectorLayer(geometry_type="POINTZ").persist()
        obj.fields = [VectorLayerField(keyname="foo", datatype="STRING", display_name="foo")]

    yield obj.id


def test_crud(res, ngw_webtest_app: WebTestApp, ngw_env):
    rurl = f"/api/resource/{res}"
    burl = f"/api/resource/{res}/feature"
    curl = f"/api/resource/{res}/feature/"
    vcur = itertools.count(start=1)

    vnext = next(vcur)
    payload = {"feature_layer": {"versioning": {"enabled": True}}}
    ngw_webtest_app.put(rurl, json=payload)
    resp_flv = ngw_webtest_app.get(rurl).json["feature_layer"]["versioning"]
    assert resp_flv.pop("epoch")
    assert resp_flv == dict(enabled=True, latest=vnext)

    resp_v1 = ngw_webtest_app.get(f"{burl}/version/{vnext}").json
    assert resp_v1["id"] == vnext
    assert resp_v1["user"] is not None

    vnext = next(vcur)
    payload = {"geom": "POINT Z (0 0 2)", "fields": {"foo": "2"}}
    resp = ngw_webtest_app.post(curl, json=payload).json
    assert resp == dict(id=1, version=vnext)

    resp_v2 = ngw_webtest_app.get(f"{burl}/version/{vnext}").json
    assert resp_v2["id"] == vnext
    assert resp_v2["tstamp"] > resp_v1["tstamp"]

    ngw_webtest_app.get(f"{burl}/1?version=1", status=404)
    resp_f1_v2 = ngw_webtest_app.get(f"{burl}/1?version=2").json
    assert resp_f1_v2["geom"] == "POINT Z (0 0 2)"
    assert resp_f1_v2["fields"] == dict(foo="2")

    payload = {"geom": "POINT Z (0 0 3)", "fields": {"foo": "3"}}
    resp = ngw_webtest_app.put(f"{burl}/1", json=payload, status=200).json
    assert resp == dict(id=1, version=next(vcur))

    ngw_webtest_app.get(f"{burl}/1" + "?version=1", status=404)
    resp = ngw_webtest_app.get(f"{burl}/1" + "?version=2").json
    assert resp["geom"] == "POINT Z (0 0 2)"

    vnext = next(vcur)
    payload = [{"id": 1, "geom": "POINT(0 0 4)"}]
    expected = [dict(id=1, version=vnext)]
    for i in range(2, 3 + 1):
        payload += [{"geom": "POINT(0 0 5)"}]
        expected += [dict(id=i, version=vnext)]
    resp = ngw_webtest_app.patch(curl, json=payload).json
    assert resp == expected

    resp = ngw_webtest_app.delete(f"{burl}/1").json
    assert resp == dict(id=1, version=next(vcur))
    ngw_webtest_app.put(f"{burl}/1", json={}, status=404)
    ngw_webtest_app.delete(f"{burl}/1", status=404)

    payload = [{"id": 2}]
    resp = ngw_webtest_app.delete(curl, json=payload).json
    ngw_webtest_app.delete(curl, json=payload, status=404)
    next(vcur)
    assert resp == [2]

    ngw_webtest_app.delete(curl)

    resp = ngw_webtest_app.get(f"{burl}/1?version=2").json
    assert resp == resp_f1_v2

    resp_flv = ngw_webtest_app.get(rurl).json["feature_layer"]["versioning"]
    assert resp_flv.pop("epoch")
    assert resp_flv == dict(enabled=True, latest=next(vcur))

    for val in (False, True, False):
        payload = {"feature_layer": {"versioning": {"enabled": val}}}
        ngw_webtest_app.put(rurl, json=payload)

    resp_flv = ngw_webtest_app.get(rurl).json["feature_layer"]["versioning"]
    assert resp_flv == dict(enabled=False)
