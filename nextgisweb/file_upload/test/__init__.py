from pathlib import Path

import pytest
import webtest


@pytest.fixture(scope="session")
def ngw_file_upload(ngw_webtest_factory):
    uploader = ngw_webtest_factory()

    def upload(arg):
        if isinstance(arg, Path):
            arg = str(arg)

        resp = uploader.post(
            "/api/component/file_upload/",
            dict(file=webtest.Upload(arg)),
        )
        return resp.json["upload_meta"][0]

    yield upload
