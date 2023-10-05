import pytest
from lxml.html import document_fromstring
from osgeo import gdal

pytestmark = pytest.mark.usefixtures("ngw_resource_defaults", "ngw_auth_administrator")


@pytest.fixture(scope="module")
def drv():
    result = gdal.GetDriverByName("NGW")
    if result is None:
        pytest.skip("GDAL NGW driver is missing!")

    yield result


def test_resource_group(drv, ngw_httptest_app, ngw_resource_group):
    url_create = "NGW:" + ngw_httptest_app.base_url + f"/resource/{ngw_resource_group}/gdal-test"

    ds = drv.Create(
        *(url_create, 0, 0, 0, gdal.GDT_Unknown),
        options=["DESCRIPTION=test resource group"],
    )
    assert ds is not None, gdal.GetLastErrorMsg()

    description = ds.GetMetadataItem("description", "")
    assert document_fromstring(description).text_content() == "test resource group"

    rid = ds.GetMetadataItem("id", "")
    url_delete = "NGW:" + ngw_httptest_app.base_url + f"/resource/{rid}"
    assert drv.Delete(url_delete) == gdal.CE_None, gdal.GetLastErrorMsg()
