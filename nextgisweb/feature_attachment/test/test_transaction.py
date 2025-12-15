import pytest
import transaction

from nextgisweb.env import DBSession
from nextgisweb.lib.geometry import Geometry

from nextgisweb.feature_layer import Feature
from nextgisweb.feature_layer.test import FeatureLayerAPI, TransactionAPI
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

            DBSession.flush()
            epoch = obj.fversioning.epoch if versioning else None

        return (obj.id, epoch)

    yield _mkres


@pytest.fixture(scope="module")
def files(ngw_file_upload, ngw_data_path):
    return (
        ngw_file_upload(ngw_data_path / "panorama.jpg"),
        ngw_file_upload(ngw_data_path / "sample.heic"),
    )


@pytest.mark.parametrize(
    "versioning",
    [
        pytest.param(False, id="versioning_disabled"),
        pytest.param(True, id="versioning_enabled"),
    ],
)
def test_workflow(versioning, files, mkres, ngw_webtest_app):
    web = ngw_webtest_app
    res, epoch = mkres(versioning)

    panorama_jpg, sample_heic = files

    furl = f"/api/resource/{res}/feature"
    fapi = FeatureLayerAPI(web, res, extensions=["attachment"])

    with TransactionAPI(web, res, epoch=epoch) as txn:  # Version 2
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

    resp = web.get(f"{furl}/1/attachment/{aid}").json
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

    with TransactionAPI(web, res, epoch=epoch) as txn:  # Version 3
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

    resp = web.get(f"{furl}/1/attachment/{aid}").json
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

    assert not versioning or fapi.changes(epoch=epoch, initial=1, target=3) == [
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

    with TransactionAPI(web, res, epoch=epoch) as txn:  # Version 4
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

    web.get(f"{furl}/1/attachment/{aid}", status=404)

    assert not versioning or fapi.changes(epoch=epoch, initial=3, target=4) == [
        {
            "action": "attachment.delete",
            "fid": 1,
            "aid": aid,
            "vid": 4,
        }
    ]

    if not versioning:
        return

    with TransactionAPI(web, res, epoch=epoch) as txn:  # Version 5
        txn.put(1, dict(action="attachment.restore", fid=1, aid=aid))
        txn.commit()

        result = txn.results()[0][1]
        assert result["action"] == "attachment.restore"

    assert fapi.changes(epoch=epoch, initial=4, target=5) == [
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

    assert fapi.changes(epoch=epoch, initial=3, target=5) == []
