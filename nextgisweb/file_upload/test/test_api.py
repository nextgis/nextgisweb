from subprocess import check_call, check_output

import pytest
import webtest

from nextgisweb.pyramid.test import WebTestApp

from ..model import FileUpload

FN0, FC0 = "zero.txt", b""
FN1, FC1 = "foo.ext", b"content-1"
FN2, FC2 = "bar.ext", b"content-2"


def test_options(ngw_env, ngw_webtest_app: WebTestApp):
    resp = ngw_webtest_app.options("/api/component/file_upload/")
    headers = resp.headers
    assert headers.get("Tus-Resumable") == "1.0.0"
    assert headers.get("Tus-Version") == "1.0.0"
    assert headers.get("Tus-Extension") == "creation,termination"
    assert headers.get("Tus-Max-Size") == str(ngw_env.file_upload.max_size)


def test_tus_method(ngw_webtest_app: WebTestApp):
    create = ngw_webtest_app.post(
        "/api/component/file_upload/",
        headers={
            "Tus-Resumable": "1.0.0",
            "Upload-Length": str(len(FC1)),
            "Upload-Metadata": "name dGVzdA==",
        },
        status=201,
    )

    assert create.headers.get("Location").startswith("http://localhost/")
    assert create.headers.get("Tus-Resumable") == "1.0.0"

    location = create.headers["Location"]
    location = location[len("http://localhost") :]

    # Content type missing
    ngw_webtest_app.patch(
        location,
        data=FC1,
        headers={
            "Tus-Resumable": "1.0.0",
            "Upload-Offset": str(0),
        },
        status=415,
    )

    # Conflict
    ngw_webtest_app.patch(
        location,
        data=FC1[1:],
        headers={
            "Tus-Resumable": "1.0.0",
            "Content-Type": "application/offset+octet-stream",
            "Upload-Offset": str(1),
        },
        status=409,
    )

    patch = ngw_webtest_app.patch(
        location,
        data=FC1,
        headers={
            "Tus-Resumable": "1.0.0",
            "Content-Type": "application/offset+octet-stream",
            "Upload-Offset": str(0),
        },
        status=204,
    )

    assert patch.headers.get("Tus-Resumable") == "1.0.0"
    assert patch.headers.get("Upload-Offset") == str(len(FC1))

    head = ngw_webtest_app.head(
        location,
        headers={
            "Tus-Resumable": "1.0.0",
        },
        status=200,
    )

    assert head.headers.get("Upload-Offset") == str(len(FC1))
    assert head.headers.get("Upload-Length") == str(len(FC1))

    get = ngw_webtest_app.get(location, status=200)

    assert get.json["size"] == len(FC1)
    assert get.json["name"] == "test"

    ngw_webtest_app.delete(location, status=204)
    ngw_webtest_app.delete(location, status=404)


@pytest.mark.parametrize("size_m", (0, 1, 16))
def test_tus_client(size_m, ngw_httptest_app, tmp_path):
    of = tmp_path / f"sample-{size_m}"
    check_call(["dd", "if=/dev/zero", f"of={of}", "bs=1M", f"count={size_m}"])

    burl = ngw_httptest_app.base_url + "/api/component/file_upload/"
    furl = check_output(["tusc", "client", burl, str(of)], encoding="utf-8").strip()
    assert furl.startswith(burl)

    response = ngw_httptest_app.get(furl)
    response.raise_for_status()

    data = response.json()
    assert data["size"] == size_m * 2**20


def test_post_single(ngw_webtest_app: WebTestApp):
    resp = ngw_webtest_app.post(
        "/api/component/file_upload/",
        data={"file": webtest.Upload(FN1, FC1)},
    )

    fupload = FileUpload(id=resp.json["upload_meta"][0]["id"])
    assert fupload.data_path.read_bytes() == FC1


def test_post_multi(ngw_webtest_app: WebTestApp):
    resp = ngw_webtest_app.post(
        "/api/component/file_upload/",
        data=[
            ["files[]", webtest.Upload(FN0, FC0)],
            ["files[]", webtest.Upload(FN1, FC1)],
            ["files[]", webtest.Upload(FN2, FC2)],
        ],
    )

    fupload = FileUpload(id=resp.json["upload_meta"][0]["id"])
    assert fupload.name == FN0
    assert fupload.data_path.read_bytes() == FC0

    fupload = FileUpload(id=resp.json["upload_meta"][1]["id"])
    assert fupload.name == FN1
    assert fupload.data_path.read_bytes() == FC1

    fupload = FileUpload(id=resp.json["upload_meta"][2]["id"])
    assert fupload.name == FN2
    assert fupload.data_path.read_bytes() == FC2


def test_put(ngw_webtest_app: WebTestApp):
    resp = ngw_webtest_app.put("/api/component/file_upload/", data=FC1)
    fupload = FileUpload(id=resp.json["id"])
    assert fupload.data_path.read_bytes() == FC1
