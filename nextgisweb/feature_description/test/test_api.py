import itertools
from io import BytesIO
from tempfile import NamedTemporaryFile
from zipfile import ZipFile

import pytest
import transaction

from nextgisweb.lib.geometry import Geometry

from nextgisweb.feature_layer import Feature
from nextgisweb.feature_layer.test import parametrize_versioning
from nextgisweb.pyramid.test import WebTestApp
from nextgisweb.vector_layer import VectorLayer

from .. import FeatureDescription

pytestmark = pytest.mark.usefixtures("ngw_resource_defaults", "ngw_auth_administrator")


@parametrize_versioning()
def test_feature_layer_api(versioning, ngw_webtest_app: WebTestApp):
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
    payload = {"geom": f"POINT Z (1 1 {vup})", "extensions": {"description": "foo"}}
    resp = ngw_webtest_app.put(f"{burl}/1", json=payload).json
    assert not versioning or resp["version"] == vup

    resp_fa = ngw_webtest_app.get(f"{burl}/1?extensions=description").json["extensions"][
        "description"
    ]
    assert resp_fa == "foo"

    if versioning:
        # Shouldn't update anything
        payload = {"extensions": {"description": "foo"}}
        resp = ngw_webtest_app.put(f"{burl}/1", json=payload).json
        assert "version" not in resp

        # Should not exist in a previous version
        resp_fa = ngw_webtest_app.get(f"{burl}/1?version={vup - 1}&extensions=description")
        resp_fa = resp_fa.json["extensions"]["description"]
        assert resp_fa is None

        # Request the current version and compare
        resp_fa = ngw_webtest_app.get(f"{burl}/1?version={vup}&extensions=description")
        resp_fa = resp_fa.json["extensions"]["description"]
        assert resp_fa == dict(version=vup, value="foo")

    # Update the description
    payload = {"extensions": {"description": "bar"}}
    resp = ngw_webtest_app.put(f"{burl}/1", json=payload).json
    assert not versioning or resp["version"] == next(vcur)
    resp_fa = ngw_webtest_app.get(f"{burl}/1?extensions=description").json["extensions"][
        "description"
    ]
    assert resp_fa == "bar"

    # Delete the description
    payload = {"extensions": {"description": None}}
    resp = ngw_webtest_app.put(f"{burl}/1", json=payload).json
    assert not versioning or resp["version"] == next(vcur)

    # Repeat deletion
    payload = {"extensions": {"description": None}}
    resp = ngw_webtest_app.put(f"{burl}/1", json=payload).json
    assert "version" not in resp

    # Check for deletion
    resp_fa = ngw_webtest_app.get(f"{burl}/1?extensions=description").json["extensions"][
        "description"
    ]
    assert resp_fa is None

    # Re-create description after deletion
    payload = {"extensions": {"description": "baz"}}
    resp = ngw_webtest_app.put(f"{burl}/1", json=payload).json
    assert not versioning or resp["version"] == next(vcur)
    resp_fa = ngw_webtest_app.get(f"{burl}/1?extensions=description").json["extensions"][
        "description"
    ]
    assert resp_fa == "baz"
    payload = {"extensions": {"description": None}}
    ngw_webtest_app.put(f"{burl}/1", json=payload)

    # Insert a new feature with an description
    vup = next(vcur)
    payload = {"geom": f"POINT Z (3 3 {vup})", "extensions": {"description": "qux"}}
    resp = ngw_webtest_app.post(f"{curl}", json=payload).json
    resp = ngw_webtest_app.get(f"{curl}?extensions=description").json
    assert len(resp) == 3

    for i, data in enumerate(resp, start=1):
        assert data["id"] == i
        assert data["geom"].startswith(f"POINT Z ({i} {i}")
        fa_ext = data["extensions"]["description"]
        if i in (1, 2):
            assert fa_ext is None
        else:
            assert fa_ext == "qux"


@pytest.fixture(scope="module")
def layer_id():
    with transaction.manager:
        res = VectorLayer(geometry_type="NONE").persist()
        for _ in range(3):
            res.feature_create(Feature())

    yield res.id


def generate_archive(files, uploader):
    with NamedTemporaryFile() as f:
        with ZipFile(f, "w") as z:
            for i in files:
                z.writestr(i["name"], i["content"])

        return uploader(f.name)


@pytest.fixture
def clear(layer_id):
    yield
    with transaction.manager:
        FeatureDescription.filter_by(resource_id=layer_id).delete()


@pytest.mark.parametrize(
    "files, result",
    (
        (
            [dict(name="qwerty.html", content="wrong-fid")],
            dict(error=True),
        ),
        (
            [dict(name="00001", content="wrong-ext")],
            dict(error=True),
        ),
        (
            [
                dict(name="00001.html", content="plain text"),
                dict(name="00003.hTmL", content="<p>paragraph</p>"),
            ],
            dict(features=[1, 3]),
        ),
        (
            [
                dict(
                    name="1.html",
                    content="plain<p>pa<i>r</i>a<b>g</b>raph</p><script>alert('hacked')</script>",
                    expected="plain<p>pa<i>r</i>a<b>g</b>raph</p>",
                ),
            ],
            dict(features=[1]),
        ),
    ),
)
def test_import_export(
    files, result, layer_id, clear, ngw_file_upload, ngw_webtest_app: WebTestApp
):
    upload_meta = generate_archive(files, ngw_file_upload)

    status = 422 if result.get("error") else 200
    ngw_webtest_app.put(
        f"/api/resource/{layer_id}/feature_description/import",
        json={"source": upload_meta},
        status=status,
    )

    if status != 200:
        return

    for file_idx, fid in enumerate(result["features"]):
        resp = ngw_webtest_app.get(
            f"/api/resource/{layer_id}/feature/{fid}",
            dict(extensions="description"),
            status=200,
        )
        description = resp.json["extensions"]["description"]

        f = files[file_idx]
        expected = f["expected"] if "expected" in f else f["content"]
        assert expected == description

    resp_export = ngw_webtest_app.get(
        f"/api/resource/{layer_id}/feature_description/export", status=200
    )
    with ZipFile(BytesIO(resp_export.body), "r") as z:
        assert len(z.filelist) == len(files)
