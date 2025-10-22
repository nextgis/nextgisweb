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


def _read_image(ds, x1, y1, x2, y2, srs):
    band_count = ds.RasterCount
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


def _color(img, tolerance=None):
    extrema = ImageStat.Stat(img).extrema
    for b in extrema:
        if (b[0] != b[1]) if tolerance is None else (abs(b[0] - b[1]) > tolerance):
            return None
    return tuple(b[0] for b in extrema)


def _test_data(alpha):
    for *rest, colour in (
        ((558728, 5789851, 1242296, 7544030), "EPSG:3857", (255, 0, 0)),
        ((5.02, 46.06, 11.16, 55.93), "EPSG:4326", (255, 0, 0)),
        ((4600000, 6800000, 4600010, 6800010), "EPSG:3857", (0, 255, 0)),
        ((42.0000, 52.0000, 42.0010, 52.0010), "EPSG:4326", (0, 255, 0)),
        ((454962, 2593621, 2239863, 3771499), "EPSG:3857", (0, 0, 255)),
        ((4.09, 22.68, 20.12, 32.06), "EPSG:4326", (0, 0, 255)),
    ):
        if alpha:
            colour += (255,)
        yield *rest, colour

    if alpha:
        for v in (((-20037508, 20037400, -20037400, 20037508), "EPSG:3857", (0, 0, 0, 0)),):
            yield v


def _test_rounds_dataset(ds, alpha=True):
    tolerance = None if alpha else 1

    for bbox, crs, expected in _test_data(alpha):
        img = _read_image(ds, *bbox, crs)
        c = _color(img, tolerance)
        if tolerance is not None:
            expected = pytest.approx(expected, abs=tolerance)
        assert c == expected


@pytest.mark.parametrize("transparent", (True, False))
def test_wms(transparent, service_id, ngw_httptest_app):
    wms_path = "WMS:{}/api/resource/{}/wms{}".format(
        ngw_httptest_app.base_url, service_id, "?Transparent=TRUE" if transparent else ""
    )

    ds = gdal.Open(wms_path, gdalconst.GA_ReadOnly)
    assert ds is not None, gdal.GetLastErrorMsg()

    layers = ds.GetSubDatasets()
    assert len(layers) == 1

    url, name = layers[0]
    assert name == "test-rounds"

    ds = gdal.Open(url, gdalconst.GA_ReadOnly)
    bands_expected = 4 if transparent else 3
    assert ds.RasterCount == bands_expected

    _test_rounds_dataset(ds, transparent)


@pytest.mark.parametrize(
    "path",
    (
        pytest.param("wms?service=WMTS&request=GetCapabilities", id="KVP"),
        pytest.param("wms/1.0.0/WMTSCapabilities.xml", id="REST"),
    ),
)
def test_wmts(path, service_id, ngw_httptest_app):
    wms_path = "WMTS:{}/api/resource/{}/{}".format(ngw_httptest_app.base_url, service_id, path)

    ds = gdal.Open(wms_path, gdalconst.GA_ReadOnly)
    assert ds is not None, gdal.GetLastErrorMsg()
    assert ds.RasterCount == 4

    _test_rounds_dataset(ds)
