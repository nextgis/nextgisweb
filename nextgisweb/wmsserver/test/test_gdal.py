# -*- coding: utf-8 -*-
from __future__ import division, absolute_import, print_function, unicode_literals

import numpy

import pytest
import transaction
from PIL import Image
from osgeo import gdal, gdalconst, gdal_array

from nextgisweb.auth import User
from nextgisweb.compat import Path
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
