import itertools

import pytest
import transaction

from nextgisweb.vector_layer.model import VectorLayer, VectorLayerField

pytestmark = pytest.mark.usefixtures("ngw_resource_defaults", "ngw_auth_administrator")


@pytest.fixture(scope="module")
def res():
    with transaction.manager:
        obj = VectorLayer(geometry_type="POINTZ").persist()
        obj.fields = [VectorLayerField(keyname="foo", datatype="STRING", display_name="foo")]

    yield obj.id


def test_crud(res, ngw_webtest_app, ngw_env):
    web = ngw_webtest_app
    rurl = f"/api/resource/{res}"
    burl = f"/api/resource/{res}/feature"
    curl = f"/api/resource/{res}/feature/"
    vcur = itertools.count(start=1)

    vnext = next(vcur)
    payload = dict(feature_layer=dict(versioning=dict(enabled=True)))
    web.put_json(rurl, payload)
    resp_flv = web.get(rurl).json["feature_layer"]["versioning"]
    assert resp_flv.pop("epoch")
    assert resp_flv == dict(enabled=True, latest=vnext)

    resp_v1 = web.get(f"{burl}/version/{vnext}").json
    assert resp_v1["id"] == vnext
    assert resp_v1["user"] is not None

    vnext = next(vcur)
    payload = dict(geom="POINT Z (0 0 2)", fields=dict(foo="2"))
    resp = web.post_json(curl, payload).json
    assert resp == dict(id=1, version=vnext)

    resp_v2 = web.get(f"{burl}/version/{vnext}").json
    assert resp_v2["id"] == vnext
    assert resp_v2["tstamp"] > resp_v1["tstamp"]

    web.get(f"{burl}/1?version=1", status=404)
    resp_f1_v2 = web.get(f"{burl}/1?version=2").json
    assert resp_f1_v2["geom"] == "POINT Z (0 0 2)"
    assert resp_f1_v2["fields"] == dict(foo="2")

    payload = dict(geom="POINT Z (0 0 3)", fields=dict(foo="3"))
    resp = web.put_json(f"{burl}/1", payload, status=200).json
    assert resp == dict(id=1, version=next(vcur))

    web.get(f"{burl}/1" + "?version=1", status=404)
    resp = web.get(f"{burl}/1" + "?version=2").json
    assert resp["geom"] == "POINT Z (0 0 2)"

    vnext = next(vcur)
    payload = [dict(id=1, geom="POINT(0 0 4)")]
    expected = [dict(id=1, version=vnext)]
    for i in range(2, 3 + 1):
        payload += [dict(geom="POINT(0 0 5)")]
        expected += [dict(id=i, version=vnext)]
    resp = web.patch_json(curl, payload).json
    assert resp == expected

    resp = web.delete(f"{burl}/1").json
    assert resp == dict(id=1, version=next(vcur))
    web.put_json(f"{burl}/1", {}, status=404)
    web.delete(f"{burl}/1", status=404)

    payload = [dict(id=2)]
    resp = web.delete_json(curl, payload).json
    web.delete_json(curl, payload, status=404)
    next(vcur)
    assert resp == [2]

    web.delete(curl)

    resp = web.get(f"{burl}/1?version=2").json
    assert resp == resp_f1_v2

    resp_flv = web.get(rurl).json["feature_layer"]["versioning"]
    assert resp_flv.pop("epoch")
    assert resp_flv == dict(enabled=True, latest=next(vcur))

    for val in (False, True, False):
        payload = dict(feature_layer=dict(versioning=dict(enabled=val)))
        web.put_json(rurl, payload)

    resp_flv = web.get(rurl).json["feature_layer"]["versioning"]
    assert resp_flv == dict(enabled=False)
