from unittest.mock import ANY

import pytest
import transaction

from nextgisweb.lib.geometry import Geometry

from nextgisweb.feature_layer import Feature
from nextgisweb.feature_layer.test import FeatureLayerAPI, parametrize_versioning
from nextgisweb.pyramid.test import WebTestApp
from nextgisweb.vector_layer import VectorLayer

pytestmark = pytest.mark.usefixtures("ngw_resource_defaults", "ngw_auth_administrator")


@pytest.fixture(scope="module")
def mkres():
    def _mkres(versioning):
        with transaction.manager:
            obj = VectorLayer(geometry_type="POINT").persist()
            obj.fversioning_configure(enabled=versioning)
            for _ in range(3):
                feat = Feature(geom=Geometry.from_wkt("POINT(0 0)"))
                obj.feature_create(feat)

        return obj.id

    yield _mkres


@pytest.fixture(scope="module")
def files(ngw_file_upload, ngw_data_path):
    return (
        ngw_file_upload(ngw_data_path / "panorama.jpg"),
        ngw_file_upload(ngw_data_path / "sample.heic"),
    )


@parametrize_versioning()
def test_workflow(versioning, files, mkres, ngw_webtest_app: WebTestApp):
    res = mkres(versioning)

    panorama_jpg, sample_heic = files

    furl = f"/api/resource/{res}/feature"
    fapi = FeatureLayerAPI(res, extensions=["attachment"])

    with fapi.transaction() as txn:  # Version 2
        txn.put(
            1,
            dict(
                action="attachment.create",
                fid=1,
                source=dict(type="file_upload", **panorama_jpg),
            ),
        )

        txn.commit()

        result = txn.results()[0][1]
        assert result["action"] == "attachment.create"
        aid = result.get("aid")
        assert isinstance(aid, int)

    resp = ngw_webtest_app.get(f"{furl}/1/attachment/{aid}").json
    assert isinstance(resp.pop("file_meta"), dict)
    assert resp == dict(
        id=aid,
        keyname=None,
        name=panorama_jpg["name"],
        size=panorama_jpg["size"],
        mime_type=panorama_jpg["mime_type"],
        description=None,
        is_image=True,
    )

    with fapi.transaction() as txn:  # Version 3
        op = dict(
            action="attachment.update",
            fid=1,
            aid=aid,
            vid=0,
            source=dict(type="file_upload", **sample_heic),
            keyname="keyname",
            name="rename.jpg",
        )

        txn.put(1, op)
        error = txn.commit_errors()[0][1]["error"]
        if versioning:
            assert error == "attachment.conflict"
            op["vid"] = 2
        else:
            assert error == "versioning_required"
            del op["vid"]

        txn.put(1, op)
        txn.commit()

        result = txn.results()[0][1]
        assert result["action"] == "attachment.update"
        fileobj = result.pop("fileobj", None)
        assert isinstance(fileobj, int)

    resp = ngw_webtest_app.get(f"{furl}/1/attachment/{aid}").json
    jpeg_size = resp.get("size", None)
    assert isinstance(jpeg_size, int)
    assert resp == dict(
        id=aid,
        keyname="keyname",
        name="rename.jpg",
        size=jpeg_size,
        mime_type="image/jpeg",
        description=None,
        is_image=True,
        file_meta={},
    )

    assert not versioning or fapi.changes(initial=1, target=3) == [
        {
            "action": "attachment.create",
            "fid": 1,
            "aid": aid,
            "vid": 3,
            "fileobj": fileobj,
            "keyname": "keyname",
            "name": "rename.jpg",
            "mime_type": "image/jpeg",
        }
    ]

    with fapi.transaction() as txn:  # Version 4
        op = dict(action="attachment.delete", fid=1, aid=aid, vid=0)

        txn.put(1, op)
        error = txn.commit_errors()[0][1]["error"]
        if versioning:
            assert error == "attachment.conflict"
            op["vid"] = 3
        else:
            assert error == "versioning_required"
            del op["vid"]

        txn.put(1, op)
        txn.commit()

        result = txn.results()[0][1]
        assert result["action"] == "attachment.delete"

    ngw_webtest_app.get(f"{furl}/1/attachment/{aid}", status=404)

    assert not versioning or fapi.changes(initial=3, target=4) == [
        {
            "action": "attachment.delete",
            "fid": 1,
            "aid": aid,
            "vid": 4,
        }
    ]

    if not versioning:
        return

    with fapi.transaction() as txn:  # Version 5
        txn.put(1, dict(action="attachment.restore", fid=1, aid=aid))
        txn.commit()

        result = txn.results()[0][1]
        assert result["action"] == "attachment.restore"

    assert fapi.changes(initial=4, target=5) == [
        {
            "action": "attachment.restore",
            "fid": 1,
            "aid": aid,
            "vid": 5,
            "fileobj": fileobj,
            "keyname": "keyname",
            "name": "rename.jpg",
            "mime_type": "image/jpeg",
        }
    ]

    assert fapi.changes(initial=3, target=5) == []

    with fapi.transaction() as txn:  # Version 6
        txn.put(1, dict(action="feature.create"))
        txn.put(
            2,
            dict(
                action="attachment.create",
                fid=dict(sn=1),
                source=dict(type="file_upload", **panorama_jpg),
            ),
        )

        txn.commit()
        assert txn.results() == [
            [1, dict(action="feature.create", fid=4)],
            [2, dict(action="attachment.create", aid=ANY, fileobj=ANY)],
        ]

    def _normalize(data: list):
        result = []
        for item in data:
            item.pop("vid", None)
            attachment = item["extensions"]["attachment"]
            if attachment is None:
                attachment = []
            else:
                attachment = [a for a in attachment if "fileobj" in a]
                for a in attachment:
                    assert "file_meta" not in a
                    a.pop("version", None)
            item["extensions"]["attachment"] = attachment
            result.append(item)
        return result

    latest_version = expected_version = fapi.versioning()["latest"]
    snapshots = {v: _normalize(fapi.feature_list(version=v)) for v in range(1, latest_version + 1)}
    snapshots[0] = []

    for v in reversed(range(0, latest_version)):
        with fapi.transaction() as txn:
            txn.put(1, dict(action="revert", tid=v))
            txn.commit()

        expected_version += 1
        latest_version = fapi.versioning()["latest"]
        assert latest_version == expected_version

        actual = _normalize(fapi.feature_list(version=expected_version))
        assert actual == snapshots[v]
