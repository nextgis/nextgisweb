import itertools
from tempfile import NamedTemporaryFile
from zipfile import ZipFile

import pytest
import transaction

from nextgisweb.lib.geometry import Geometry
from nextgisweb.lib.json import dumpb

from nextgisweb.feature_layer import Feature
from nextgisweb.vector_layer import VectorLayer

from .. import FeatureAttachment

pytestmark = pytest.mark.usefixtures("ngw_resource_defaults", "ngw_auth_administrator")


@pytest.fixture(scope="module")
def layer_id():
    with transaction.manager:
        res = VectorLayer(geometry_type="POINT").persist()
        for _ in range(3):
            f = Feature()
            f.geom = Geometry.from_wkt("POINT (0 0)")
            res.feature_create(f)

    yield res.id


def generate_archive(files, uploader):
    with NamedTemporaryFile() as f:
        with ZipFile(f, "w") as z:
            for i in files:
                assert ("content" in i) is not ("size" in i)
                if "content" in i:
                    content = i["content"]
                else:
                    content = b"0" * i["size"]
                z.writestr(i["name"], content)

        return uploader(f.name)


@pytest.fixture
def clear(layer_id):
    yield
    with transaction.manager:
        FeatureAttachment.filter_by(resource_id=layer_id).delete()


@pytest.mark.parametrize(
    "files, result",
    (
        (
            [
                dict(name="00001/test_A", size=1),
                dict(name="00003/test_B", size=2),
            ],
            dict(features=[1, 3]),
        ),
        (
            [
                dict(name="00001/test_A", size=1),
                dict(name="AAAA2/test_B", size=2),
            ],
            dict(error=True),
        ),
        (
            [
                dict(name="00001/test_A", size=1),
                dict(name="00002/test_B", size=2),
                dict(name="00002/test_C", size=3),
                dict(
                    name="metadata.json",
                    content=dumpb(
                        dict(
                            items={
                                "00001/test_A": dict(
                                    name="test_A",
                                    feature_id=3,
                                    mime_type="text/plain",
                                    description=None,
                                ),
                                "00002/test_B": dict(
                                    name="test_B",
                                    feature_id=1,
                                    mime_type="text/plain",
                                    description=None,
                                ),
                                "00002/test_C": dict(
                                    name=None,
                                    feature_id=2,
                                    mime_type="text/plain",
                                    description="No name",
                                ),
                            }
                        )
                    ),
                ),
            ],
            dict(features=[3, 1, 2]),
        ),
        (
            [
                dict(name="00001/test_A", size=1),
                dict(name="whoiam", size=2),
                dict(
                    name="metadata.json",
                    content=dumpb(
                        dict(
                            items={
                                "00001/test_A": dict(
                                    name="test_A",
                                    feature_id=3,
                                    mime_type="text/plain",
                                    description=None,
                                ),
                            }
                        )
                    ),
                ),
            ],
            dict(error=True),
        ),
        (
            [
                dict(name="test_A", size=1),
                dict(name="test_B", size=1),
                dict(name="test_C", size=1),
                dict(
                    name="metadata.json",
                    content=dumpb(
                        dict(
                            items={
                                "test_A": dict(
                                    name="test_A",
                                    keyname="A",
                                    feature_id=1,
                                ),
                                "test_B": dict(
                                    name="test_B",
                                    keyname="B",
                                    feature_id=1,
                                ),
                                "test_C": dict(
                                    name="test_C",
                                    feature_id=2,
                                ),
                            }
                        )
                    ),
                ),
            ],
            dict(features=[1, 1, 2]),
        ),
    ),
)
def test_import(files, result, layer_id, clear, ngw_file_upload, ngw_webtest_app):
    upload_meta = generate_archive(files, ngw_file_upload)

    status = 422 if result.get("error") else 200
    resp = ngw_webtest_app.put_json(
        f"/api/resource/{layer_id}/feature_attachment/import",
        dict(source=upload_meta),
        status=status,
    )

    if status != 200:
        return

    import_result = resp.json

    imported = 0
    fid_last = att_idx = attachments = None
    for file_idx, fid in enumerate(result["features"]):
        imported += 1

        if fid != fid_last:
            resp = ngw_webtest_app.get(
                f"/api/resource/{layer_id}/feature/{fid}/attachment/",
                status=200,
            )
            attachments = resp.json
            att_idx = 0
        else:
            att_idx += 1

        f = files[file_idx]
        size = f["size"] if "size" in f else len(f["content"])
        attachment = attachments[att_idx]
        assert attachment["size"] == size

    assert import_result == dict(imported=imported, skipped=0)


def test_import_multiple(layer_id, ngw_file_upload, ngw_webtest_app):
    files = (
        dict(name="00001/test_A", content="AAA"),
        dict(name="00001/test_B", content="BBB"),
        dict(name="00002/test_C", content="AAA"),
    )
    upload_meta = generate_archive(files, ngw_file_upload)
    resp = ngw_webtest_app.put_json(
        f"/api/resource/{layer_id}/feature_attachment/import",
        dict(source=upload_meta),
        status=200,
    )
    assert resp.json == dict(imported=3, skipped=0)

    resp = ngw_webtest_app.put_json(
        f"/api/resource/{layer_id}/feature_attachment/import",
        dict(source=upload_meta),
        status=200,
    )
    assert resp.json == dict(imported=0, skipped=3)

    resp = ngw_webtest_app.put_json(
        f"/api/resource/{layer_id}/feature_attachment/import",
        dict(source=upload_meta, replace=True),
        status=200,
    )
    assert resp.json == dict(imported=3, skipped=0)

    files = (
        dict(name="somefile.txt", content="BBB"),
        dict(name="00002/test_D", content="CCC"),
        dict(
            name="metadata.json",
            content=dumpb(
                dict(
                    items={
                        "somefile.txt": dict(
                            name="somefile",
                            feature_id=1,
                            mime_type="text/plain",
                            description=None,
                        ),
                        "00002/test_D": dict(
                            name="test_B",
                            feature_id=2,
                            mime_type="text/plain",
                            description=None,
                        ),
                    }
                )
            ),
        ),
    )
    upload_meta = generate_archive(files, ngw_file_upload)
    resp = ngw_webtest_app.put_json(
        f"/api/resource/{layer_id}/feature_attachment/import",
        dict(source=upload_meta),
        status=200,
    )
    assert resp.json == dict(imported=1, skipped=1)


# name = '{feature_id}/{file_name}'
# TODO: Update whenever the structure of file_meta changes; add images without xmp meta
def test_import_image(layer_id, clear, ngw_file_upload, ngw_webtest_app, ngw_data_path):
    img_data = (ngw_data_path / "panorama.jpg").read_bytes()
    files = (dict(name="00003/image", content=img_data),)
    upload_meta = generate_archive(files, ngw_file_upload)
    resp = ngw_webtest_app.put_json(
        f"/api/resource/{layer_id}/feature_attachment/import",
        dict(source=upload_meta),
        status=200,
    )
    assert resp.json == dict(imported=1, skipped=0)

    with transaction.manager:
        obj = FeatureAttachment.filter_by(resource_id=layer_id, feature_id=3).one()
        assert obj.file_meta == {
            "timestamp": "2020-02-21T20:33:54",
            "panorama": {"ProjectionType": "equirectangular"},
        }


def test_heic(layer_id, clear, ngw_file_upload, ngw_webtest_app, ngw_data_path):
    img_path = ngw_data_path / "sample.heic"
    upload_meta = ngw_file_upload(img_path)
    upload_meta["name"] = img_path.name

    url = f"/api/resource/{layer_id}/feature/1/attachment/"
    resp = ngw_webtest_app.post_json(url, dict(file_upload=upload_meta), status=200)
    aid = resp.json["id"]

    resp = ngw_webtest_app.get(url + str(aid), status=200)
    assert resp.json["mime_type"] == "image/jpeg"
    assert resp.json["name"] == "sample.jpg"


@pytest.fixture(scope="module")
def panorama_jpg(ngw_file_upload, ngw_data_path):
    yield dict(ngw_file_upload(ngw_data_path / "panorama.jpg"))


@pytest.mark.parametrize(
    "versioning",
    [
        pytest.param(False, id="fversioning_disabled"),
        pytest.param(True, id="fversioning_enabled"),
    ],
)
def test_feature_layer_and_feature_attachment_api(versioning, panorama_jpg, ngw_webtest_app):
    web = ngw_webtest_app
    vcur = itertools.count(start=1)

    with transaction.manager:
        res = VectorLayer(geometry_type="POINTZ").persist()
        res.fversioning_configure(enabled=versioning)

        vup = next(vcur)
        for i in (1, 2, 3):
            feat = Feature()
            feat.geom = Geometry.from_wkt(f"POINT Z ({i} {i} {vup})")
            res.feature_create(feat)
        res.fversioning_close(raise_if_not_enabled=False)

    burl = f"/api/resource/{res.id}/feature"
    curl = f"/api/resource/{res.id}/feature/"

    vup = next(vcur)
    exts = [dict(file_upload=panorama_jpg)]
    payload = dict(geom=f"POINT Z (1 1 {vup})", extensions=dict(attachment=exts))
    resp = web.put_json(f"{burl}/1", payload).json
    assert not versioning or resp["version"] == vup

    resp_fa = web.get(f"{burl}/1?extensions=attachment").json["extensions"]["attachment"]
    assert len(resp_fa) == 1
    fa_data = resp_fa[0]
    assert fa_data["size"] == panorama_jpg["size"]
    assert fa_data["name"] == panorama_jpg["name"]
    assert fa_data["mime_type"] == panorama_jpg["mime_type"]
    assert fa_data["is_image"] is True
    assert isinstance(fa_data["file_meta"], dict)
    fa_id = fa_data["id"]

    # Compare to feature attachment API
    resp_ext_api = web.get(f"{burl}/1/attachment/").json
    assert resp_ext_api == resp_ext_api

    if versioning:
        # Shouldn't update anything
        exts = [dict(id=fa_id)]
        payload = dict(extensions=dict(attachment=exts))
        resp = web.put_json(f"{burl}/1", payload).json
        assert "version" not in resp

        # Should not exist in a previous version.
        resp_fa = web.get(f"{burl}/1?version={vup - 1}&extensions=attachment")
        resp_fa = resp_fa.json["extensions"]["attachment"]
        assert resp_fa is None

        # Request the current version and compare.
        resp_fa = web.get(f"{burl}/1?version={vup}&extensions=attachment")
        resp_fa = resp_fa.json["extensions"]["attachment"]
        assert len(resp_fa) == 1
        fa_data = resp_fa[0]
        assert fa_data["version"] == vup
        assert fa_data["name"] == panorama_jpg["name"]
        assert fa_data["mime_type"] == panorama_jpg["mime_type"]

    # Rename, should update version
    vup = next(vcur)
    exts = [dict(id=fa_id, name="bar.jpg")]
    payload = dict(extensions=dict(attachment=exts))
    resp = web.put_json(f"{burl}/1", payload).json
    assert not versioning or resp["version"] == vup

    # Check renaming result
    resp_fa = web.get(f"{burl}/1?extensions=attachment").json["extensions"]["attachment"]
    assert len(resp_fa) == 1
    fa_data = resp_fa[0]
    assert fa_data["name"] == "bar.jpg"

    if versioning:
        # Check name in the previous version
        resp_fa = web.get(f"{burl}/1?version={vup - 1}&extensions=attachment")
        resp_fa = resp_fa.json["extensions"]["attachment"]
        assert len(resp_fa) == 1
        fa_data = resp_fa[0]
        assert fa_data["name"] == "panorama.jpg"

    # Delete all attachments the first feature
    payload = dict(extensions=dict(attachment=[]))
    resp = web.put_json(f"{burl}/1", payload).json
    assert not versioning or resp["version"] == next(vcur)

    # Check for deletion
    resp_fa = web.get(f"{burl}/1?extensions=attachment").json["extensions"]["attachment"]
    assert resp_fa is None

    # Compare to FA API
    resp_ext_api = web.post_json(f"{burl}/2/attachment/", dict(file_upload=panorama_jpg)).json
    assert not versioning or resp_ext_api["version"] == next(vcur)
    assert versioning or "version" not in resp_ext_api

    vup = next(vcur)
    exts = dict(extensions=dict(attachment=[dict(file_upload=panorama_jpg)]))
    payload = [dict(id=2, **exts), dict(id=3, **exts), dict(geom=f"POINT Z (4 4 {vup})", **exts)]
    resp = web.patch_json(curl, payload).json
    for id, feat in zip((2, 3, 4), resp):
        assert feat["id"] == id
        assert not versioning or feat["version"] == vup

    # Insert a new feature with an attachment
    vup = next(vcur)
    payload = dict(geom=f"POINT Z (5 5 {vup})", **exts)
    resp = web.post_json(curl, payload).json
    resp = web.get(f"{curl}?extensions=attachment").json
    assert len(resp) == 5

    for i, data in enumerate(resp, start=1):
        assert data["id"] == i
        assert data["geom"].startswith(f"POINT Z ({i} {i}")
        fa_ext = data["extensions"]["attachment"]
        if i == 1:
            assert fa_ext is None
            continue

        assert len(fa_ext) == 1
        fa_data = fa_ext[0]
        assert fa_data["size"] == panorama_jpg["size"]
        assert fa_data["name"] == panorama_jpg["name"]
        assert fa_data["mime_type"] == panorama_jpg["mime_type"]
        assert fa_data["is_image"] is True
        assert isinstance(fa_data["file_meta"], dict)

        if i == 2:
            # Compare to FA API
            aid = fa_data["id"]
            resp_ext_api = web.get(f"{burl}/2/attachment/{aid}").json
            assert resp_ext_api == fa_data

            # Delete via FA API
            web.delete(f"{burl}/2/attachment/{aid}")
