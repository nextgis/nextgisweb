# -*- coding: utf-8 -*-
from __future__ import absolute_import, print_function, unicode_literals

import pytest
from osgeo import gdal


@pytest.fixture(scope='module')
def drv():
    result = gdal.GetDriverByName(b'NGW')
    assert result is not None
    yield result


def test_resource_group(drv, ngw_httptest_app, ngw_auth_administrator):
    url_create = 'NGW:' + ngw_httptest_app.base_url + '/resource/0/' + 'gdal-test'

    ds = drv.Create(url_create, 0, 0, 0, gdal.GDT_Unknown, options=[
        'DESCRIPTION=test resource group'])
    assert ds is not None, gdal.GetLastErrorMsg()

    assert ds.GetMetadataItem(b'description', b'') == 'test resource group'

    url_delete = 'NGW:' + ngw_httptest_app.base_url + '/resource/{}'.format(
        ds.GetMetadataItem(b'id', b''))
    assert drv.Delete(url_delete) == gdal.CE_None, gdal.GetLastErrorMsg()
