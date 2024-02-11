from tempfile import NamedTemporaryFile

import pytest
import transaction
from osgeo import gdal, osr

from ..model import RasterLayer

pytestmark = pytest.mark.usefixtures("ngw_resource_defaults", "ngw_auth_administrator")


@pytest.fixture(scope="module")
def raster_layer_id(ngw_data_path, ngw_env):
    with transaction.manager:
        obj = RasterLayer().persist()
        obj.load_file(ngw_data_path / "sochi-aster-colorized.tif")

    yield obj.id


@pytest.mark.parametrize("epsg", [3857, 4326])
def test_export_srs(epsg, ngw_webtest_app, raster_layer_id):
    srs_expected = osr.SpatialReference()
    srs_expected.ImportFromEPSG(epsg)

    resp = ngw_webtest_app.get(
        "/api/resource/%d/export" % raster_layer_id,
        params={"srs": epsg},
    )
    with NamedTemporaryFile() as f:
        f.write(resp.body)
        ds = gdal.OpenEx(f.name)
        srs = osr.SpatialReference()
        srs.ImportFromWkt(ds.GetProjection())
        assert srs.IsSame(srs_expected)


@pytest.mark.parametrize("format", ["GTiff", "RMF", "HFA"])
def test_export_format(format, ngw_webtest_app, raster_layer_id):
    resp = ngw_webtest_app.get(
        "/api/resource/%d/export" % raster_layer_id,
        params={"format": format, "bands": "1,2,3"},
    )

    with NamedTemporaryFile() as f:
        f.write(resp.body)
        ds = gdal.OpenEx(f.name)
        assert ds.GetDriver().ShortName == format
