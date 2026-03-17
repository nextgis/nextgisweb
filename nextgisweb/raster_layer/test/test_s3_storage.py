import pytest
from osgeo import gdal

from ..model import RasterLayerStorage


class StorageStub:
    gdal_env = RasterLayerStorage.gdal_env
    vsi_path = RasterLayerStorage.vsi_path
    configure_gdal = RasterLayerStorage.configure_gdal

    def __init__(self, **kwargs):
        defaults = dict(
            endpoint="http://localhost:5555",
            bucket="test-bucket",
            access_key="minioadmin",
            secret_key="minioadmin",
            prefix="",
        )
        defaults.update(kwargs)
        self.__dict__.update(defaults)


@pytest.mark.parametrize(
    "prefix, filename, expected",
    [
        ("", "foo.tif", "/vsis3/test-bucket/foo.tif"),
        ("data", "foo.tif", "/vsis3/test-bucket/data/foo.tif"),
        ("data/", "foo.tif", "/vsis3/test-bucket/data/foo.tif"),
    ],
)
def test_vsi_path(prefix, filename, expected):
    storage = StorageStub(prefix=prefix)
    assert storage.vsi_path(filename) == expected


def test_gdal_env_keys():
    storage = StorageStub(endpoint="https://s3.example.com", access_key="AK", secret_key="SK")
    env = storage.gdal_env()
    assert env["AWS_S3_ENDPOINT"] == "s3.example.com"
    assert env["AWS_HTTPS"] == "YES"
    assert env["AWS_ACCESS_KEY_ID"] == "AK"
    assert env["AWS_SECRET_ACCESS_KEY"] == "SK"
    assert env["AWS_VIRTUAL_HOSTING"] == "FALSE"

    storage_http = StorageStub(endpoint="http://minio:9000")
    assert storage_http.gdal_env()["AWS_HTTPS"] == "NO"


def test_configure_gdal_scopes_credentials():
    storage = StorageStub(
        bucket="mybucket",
        prefix="rasters",
        access_key="MYKEY",
        secret_key="MYSECRET",
    )
    storage.configure_gdal()

    path_prefix = storage.vsi_path("")  # /vsis3/mybucket/rasters/
    assert gdal.GetPathSpecificOption(path_prefix, "AWS_ACCESS_KEY_ID") == "MYKEY"
    assert gdal.GetPathSpecificOption(path_prefix, "AWS_SECRET_ACCESS_KEY") == "MYSECRET"

    other_prefix = "/vsis3/other-bucket/"
    assert gdal.GetPathSpecificOption(other_prefix, "AWS_ACCESS_KEY_ID") is None
