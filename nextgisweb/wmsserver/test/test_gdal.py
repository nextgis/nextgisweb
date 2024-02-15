from pathlib import Path

import numpy
import pytest
import transaction
from osgeo import gdal, gdal_array, gdalconst
from PIL import Image, ImageStat

from nextgisweb.env import DBSession

from nextgisweb.raster_layer import RasterLayer
from nextgisweb.raster_style import RasterStyle

from .. import Layer, Service

pytestmark = pytest.mark.usefixtures("ngw_resource_defaults", "ngw_auth_administrator")


@pytest.fixture(scope="module")
def rlayer_id(ngw_env):
    with transaction.manager:
        obj = RasterLayer().persist()

        from nextgisweb.raster_layer import test as raster_layer_test

        path = Path(raster_layer_test.__file__).parent / "data/rounds.tif"

        obj.load_file(path)

        DBSession.flush()
        DBSession.expunge(obj)

    yield obj.id


@pytest.fixture(scope="module")
def rstyle_id(ngw_env, rlayer_id):
    with transaction.manager:
        obj = RasterStyle(parent_id=rlayer_id).persist()

        DBSession.flush()
        DBSession.expunge(obj)

    yield obj.id


@pytest.fixture(scope="module")
def service_id(rstyle_id):
    with transaction.manager:
        obj = Service().persist()

        DBSession.flush()

        obj.layers.append(
            Layer(resource_id=rstyle_id, keyname="test_rounds", display_name="test-rounds")
        )

        DBSession.flush()
        DBSession.expunge(obj)

    yield obj.id


def test_read(service_id, ngw_httptest_app):
    wms_path = "WMS:{}/api/resource/{}/wms".format(ngw_httptest_app.base_url, service_id)

    ds = gdal.Open(wms_path, gdalconst.GA_ReadOnly)
    assert ds is not None, gdal.GetLastErrorMsg()

    layers = ds.GetSubDatasets()
    assert len(layers) == 1

    url, name = layers[0]
    assert name == "test-rounds"

    ds = gdal.Open(url, gdalconst.GA_ReadOnly)
    band_count = ds.RasterCount
    assert band_count == 3

    # TODO channel values change for some reason
    tolerance = 2

    def read_image(x1, y1, x2, y2, srs):
        width = height = 500
        ds_img = gdal.Warp(
            "",
            ds,
            options=gdal.WarpOptions(
                width=width, height=height, outputBounds=(x1, y1, x2, y2), dstSRS=srs, format="MEM"
            ),
        )
        array = numpy.zeros((height, width, band_count), numpy.uint8)
        for i in range(band_count):
            band = ds_img.GetRasterBand(i + 1)
            array[:, :, i] = gdal_array.BandReadAsArray(band)
        img = Image.fromarray(array)
        return img

    def color(img):
        extrema = ImageStat.Stat(img).extrema
        for b in extrema:
            if abs(b[0] - b[1]) > tolerance:
                return None
        return [b[0] for b in extrema]

    img_red = read_image(558728, 5789851, 1242296, 7544030, "EPSG:3857")
    assert color(img_red) == pytest.approx((255, 0, 0), abs=tolerance)
    img_red = read_image(5.02, 46.06, 11.16, 55.93, "EPSG:4326")
    assert color(img_red) == pytest.approx((255, 0, 0), abs=tolerance)

    img_green = read_image(4600000, 6800000, 4600010, 6800010, "EPSG:3857")
    assert color(img_green) == pytest.approx((0, 255, 0), abs=tolerance)
    img_green = read_image(42.0000, 52.0000, 42.0010, 52.0010, "EPSG:4326")
    assert color(img_green) == pytest.approx((0, 255, 0), abs=tolerance)

    img_blue = read_image(454962, 2593621, 2239863, 3771499, "EPSG:3857")
    assert color(img_blue) == pytest.approx((0, 0, 255), abs=tolerance)
    img_blue = read_image(4.09, 22.68, 20.12, 32.06, "EPSG:4326")
    assert color(img_blue) == pytest.approx((0, 0, 255), abs=tolerance)
