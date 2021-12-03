import numpy
from pathlib import Path

import pytest
import transaction
from PIL import Image, ImageStat
from osgeo import gdal, gdalconst, gdal_array

from nextgisweb.auth import User
from nextgisweb.models import DBSession
from nextgisweb.raster_layer import RasterLayer
from nextgisweb.raster_style import RasterStyle
from nextgisweb.spatial_ref_sys import SRS
from nextgisweb.wmsserver import Service, Layer


@pytest.fixture(scope='module')
def rlayer_id(ngw_env, ngw_resource_group):
    with transaction.manager:
        obj = RasterLayer(
            parent_id=ngw_resource_group,
            display_name='test-wms-rlayer',
            owner_user=User.by_keyname('administrator'),
            srs=SRS.filter_by(id=3857).one()
        ).persist()

        import nextgisweb.raster_layer.test
        path = Path(nextgisweb.raster_layer.test.__file__).parent / 'data/rounds.tif'

        obj.load_file(str(path), ngw_env)

        DBSession.flush()
        DBSession.expunge(obj)

    yield obj.id

    with transaction.manager:
        DBSession.delete(RasterLayer.filter_by(id=obj.id).one())


@pytest.fixture(scope='module')
def rstyle_id(ngw_env, rlayer_id):
    with transaction.manager:
        obj = RasterStyle(
            parent_id=rlayer_id,
            display_name='test-wms-rstyle',
            owner_user=User.by_keyname('administrator')
        ).persist()

        DBSession.flush()
        DBSession.expunge(obj)

    yield obj.id

    with transaction.manager:
        DBSession.delete(RasterStyle.filter_by(id=obj.id).one())


@pytest.fixture(scope='module')
def service_id(ngw_resource_group, rstyle_id):
    with transaction.manager:
        obj = Service(
            parent_id=ngw_resource_group,
            display_name='test-wms-service',
            owner_user=User.by_keyname('administrator')
        ).persist()

        DBSession.flush()

        obj.layers.append(Layer(
            resource_id=rstyle_id, keyname='test_rounds', display_name='test-rounds'))

        DBSession.flush()
        DBSession.expunge(obj)

    yield obj.id

    with transaction.manager:
        DBSession.delete(Service.filter_by(id=obj.id).one())


def test_read(service_id, ngw_httptest_app, ngw_auth_administrator):
    wms_path = 'WMS:{}/api/resource/{}/wms'.format(
        ngw_httptest_app.base_url, service_id)

    ds = gdal.Open(wms_path, gdalconst.GA_ReadOnly)
    assert ds is not None, gdal.GetLastErrorMsg()

    layers = ds.GetSubDatasets()
    assert len(layers) == 1

    url, name = layers[0]
    assert name == 'test-rounds'

    ds = gdal.Open(url, gdalconst.GA_ReadOnly)
    band_count = ds.RasterCount
    assert band_count == 3

    # TODO channel values change for some reason
    tolerance = 2

    def read_image(*extent):
        width = height = 500
        ds_img = gdal.Warp('', ds, options=gdal.WarpOptions(
            width=width, height=height, outputBounds=extent, dstSRS='EPSG:3857',
            format='MEM'))
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

    img_red = read_image(558728, 5789851, 1242296, 7544030)
    assert color(img_red) == pytest.approx((255, 0, 0), abs=tolerance)

    img_green = read_image(4580543, 6704397, 5033914, 6932643)
    assert color(img_green) == pytest.approx((0, 255, 0), abs=tolerance)

    img_blue = read_image(454962, 2593621, 2239863, 3771499)
    assert color(img_blue) == pytest.approx((0, 0, 255), abs=tolerance)
