import os.path
from tempfile import NamedTemporaryFile

import pytest
import transaction
from osgeo import gdal, osr

from nextgisweb.env import DBSession

from ..model import RasterLayer

pytestmark = pytest.mark.usefixtures("ngw_resource_defaults", "ngw_auth_administrator")


@pytest.fixture(scope="module")
def raster_layer_id(ngw_env):
    with transaction.manager:
        obj = RasterLayer().persist()

        obj.load_file(
            os.path.join(os.path.split(__file__)[0], "data", "sochi-aster-colorized.tif"),
            ngw_env,
        )

        DBSession.flush()
        DBSession.expunge(obj)

    yield obj.id


@pytest.mark.parametrize(
    "epsg",
    [
        4326,
        3857,
    ],
)
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


@pytest.mark.parametrize(
    "format",
    [
        "GTiff",
        "RMF",
        pytest.param(
            "HFA",
            marks=pytest.mark.skipif(
                gdal.VersionInfo() <= "2400000", reason="Broken on GDAL <= 2.4"
            ),
        ),
    ],
)
def test_export_format(format, ngw_webtest_app, raster_layer_id):
    resp = ngw_webtest_app.get(
        "/api/resource/%d/export" % raster_layer_id,
        params={"format": format, "bands": "1,2,3"},
    )
    with NamedTemporaryFile() as f:
        f.write(resp.body)
        ds = gdal.OpenEx(f.name)
        assert ds.GetDriver().ShortName == format
