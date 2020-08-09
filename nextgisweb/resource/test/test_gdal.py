# -*- coding: utf-8 -*-
from __future__ import absolute_import, print_function, unicode_literals
from six import ensure_str

import pytest
from osgeo import gdal


@pytest.fixture(scope='module')
def drv():
    result = gdal.GetDriverByName(ensure_str('NGW'))
    if result is None:
        pytest.skip("GDAL NGW driver is missing!")

    yield result


def test_resource_group(drv, ngw_httptest_app, ngw_auth_administrator, ngw_resource_group):
    url_create = 'NGW:' + ngw_httptest_app.base_url + \
        '/resource/{}/gdal-test'.format(ngw_resource_group)

    ds = drv.Create(url_create, 0, 0, 0, gdal.GDT_Unknown, options=[
        'DESCRIPTION=test resource group'])
    assert ds is not None, gdal.GetLastErrorMsg()

    assert ds.GetMetadataItem(b'description', b'') == 'test resource group'

    url_delete = 'NGW:' + ngw_httptest_app.base_url + '/resource/{}'.format(
        ds.GetMetadataItem(b'id', b''))
    assert drv.Delete(url_delete) == gdal.CE_None, gdal.GetLastErrorMsg()
