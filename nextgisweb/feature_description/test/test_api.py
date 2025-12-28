import itertools

import pytest
import transaction

from nextgisweb.lib.geometry import Geometry

from nextgisweb.feature_layer import Feature
from nextgisweb.feature_layer.test import parametrize_versioning
from nextgisweb.vector_layer import VectorLayer

pytestmark = pytest.mark.usefixtures("ngw_resource_defaults", "ngw_auth_administrator")


@parametrize_versioning()
def test_feature_layer_api(versioning, ngw_webtest_app):
    web = ngw_webtest_app
    vcur = itertools.count(start=1)

    with transaction.manager:
        res = VectorLayer(geometry_type="POINTZ").persist()
        res.fversioning_configure(enabled=versioning)

        vup = next(vcur)
        for i in (1, 2):
            feat = Feature()
            feat.geom = Geometry.from_wkt(f"POINT Z ({i} {i} {vup})")
            res.feature_create(feat)
        res.fversioning_close(raise_if_not_enabled=False)

    burl = f"/api/resource/{res.id}/feature"
    curl = f"/api/resource/{res.id}/feature/"

    vup = next(vcur)
    payload = dict(geom=f"POINT Z (1 1 {vup})", extensions=dict(description="foo"))
    resp = web.put_json(f"{burl}/1", payload).json
    assert not versioning or resp["version"] == vup

    resp_fa = web.get(f"{burl}/1?extensions=description").json["extensions"]["description"]
    assert resp_fa == "foo"

    if versioning:
        # Shouldn't update anything
        payload = dict(extensions=dict(description="foo"))
        resp = web.put_json(f"{burl}/1", payload).json
        assert "version" not in resp

        # Should not exist in a previous version
        resp_fa = web.get(f"{burl}/1?version={vup - 1}&extensions=description")
        resp_fa = resp_fa.json["extensions"]["description"]
        assert resp_fa is None

        # Request the current version and compare
        resp_fa = web.get(f"{burl}/1?version={vup}&extensions=description")
        resp_fa = resp_fa.json["extensions"]["description"]
        assert resp_fa == dict(version=vup, value="foo")

    # Update the description
    payload = dict(extensions=dict(description="bar"))
    resp = web.put_json(f"{burl}/1", payload).json
    assert not versioning or resp["version"] == next(vcur)
    resp_fa = web.get(f"{burl}/1?extensions=description").json["extensions"]["description"]
    assert resp_fa == "bar"

    # Delete the description
    payload = dict(extensions=dict(description=None))
    resp = web.put_json(f"{burl}/1", payload).json
    assert not versioning or resp["version"] == next(vcur)

    # Repeat deletion
    payload = dict(extensions=dict(description=None))
    resp = web.put_json(f"{burl}/1", payload).json
    assert "version" not in resp

    # Check for deletion
    resp_fa = web.get(f"{burl}/1?extensions=description").json["extensions"]["description"]
    assert resp_fa is None

    # Insert a new feature with an description
    vup = next(vcur)
    payload = dict(geom=f"POINT Z (3 3 {vup})", extensions=dict(description="qux"))
    resp = web.post_json(curl, payload).json
    resp = web.get(f"{curl}?extensions=description").json
    assert len(resp) == 3

    for i, data in enumerate(resp, start=1):
        assert data["id"] == i
        assert data["geom"].startswith(f"POINT Z ({i} {i}")
        fa_ext = data["extensions"]["description"]
        if i in (1, 2):
            assert fa_ext is None
        else:
            assert fa_ext == "qux"
