# -*- coding: utf-8 -*-
from __future__ import division, absolute_import, print_function, unicode_literals
import six
from itertools import product
from uuid import uuid4

import pytest
import transaction
from osgeo import gdal
from osgeo import ogr

from nextgisweb.compat import Path
from nextgisweb.models import DBSession
from nextgisweb.auth import User
from nextgisweb.spatial_ref_sys import SRS
from nextgisweb.vector_layer import VectorLayer
from nextgisweb.wfsserver.model import Service as WFSService, Layer as WFSLayer


TEST_WFS_VERSIONS = ('2.0.2', '2.0.0', '1.0.0', )


def type_geojson_dataset():
    import nextgisweb.vector_layer.test
    path = Path(nextgisweb.vector_layer.test.__file__).parent / 'data' / 'type.geojson'
    result = ogr.Open(str(path))
    assert result is not None, gdal.GetLastErrorMsg()
    return result


@pytest.fixture(scope='module')
def service(ngw_resource_group):
    with transaction.manager:
        res_vl = VectorLayer(
            parent_id=ngw_resource_group, display_name='test_vector_layer',
            owner_user=User.by_keyname('administrator'),
            srs=SRS.filter_by(id=3857).one(),
            tbl_uuid=six.text_type(uuid4().hex),
        ).persist()

        dsource = type_geojson_dataset()
        layer = dsource.GetLayer(0)

        res_vl.setup_from_ogr(layer, lambda x: x)
        res_vl.load_from_ogr(layer, lambda x: x)

        DBSession.flush()

        # NOTE: GDAL doesn't support time fields in GML / WFS. It completely breaks
        # XSD schema parsing. Delete the time field to pass tests.
        DBSession.delete(res_vl.field_by_keyname('time'))

        res_wfs = WFSService(
            parent_id=ngw_resource_group, display_name='test_wfsserver_service',
            owner_user=User.by_keyname('administrator'),
        ).persist()

        res_wfs.layers.append(WFSLayer(
            resource=res_vl, keyname='test',
            display_name='test', maxfeatures=1000,
        ))

        DBSession.flush()

        DBSession.expunge(res_vl)
        DBSession.expunge(res_wfs)

    yield res_wfs.id

    with transaction.manager:
        DBSession.delete(VectorLayer.filter_by(id=res_vl.id).one())
        DBSession.delete(WFSService.filter_by(id=res_wfs.id).one())


@pytest.fixture()
def features(service, ngw_httptest_app, ngw_auth_administrator):
    # Module scope doesn't work here because of function scope fixtures.
    # Let's manually cache result in function attribute _cached_result.

    def factory(version):
        if not hasattr(factory, '_cache'):
            factory._cache = dict()

        if version not in factory._cache:
            wfs_ds = ogr.Open("WFS:{}/api/resource/{}/wfs?VERSION={}".format(
                ngw_httptest_app.base_url, service, version), True)
            assert wfs_ds is not None, gdal.GetLastErrorMsg()

            wfs_layer = wfs_ds.GetLayer(0)
            assert wfs_layer is not None, gdal.GetLastErrorMsg()

            ref_ds = type_geojson_dataset()
            ref_layer = ref_ds.GetLayer(0)

            factory._cache[version] = (
                list(zip(wfs_layer, ref_layer)),
                wfs_ds, ref_ds,  # Just for keep GDAL references
            )

        return factory._cache[version][0]

    return factory


@pytest.mark.parametrize('version', TEST_WFS_VERSIONS)
def test_layer_name(version, service, ngw_httptest_app, ngw_auth_administrator):
    driver = ogr.GetDriverByName(six.ensure_str('WFS'))
    wfs_ds = driver.Open("WFS:{}/api/resource/{}/wfs?VERSION={}".format(
        ngw_httptest_app.base_url, service, version), True)
    assert wfs_ds is not None, gdal.GetLastErrorMsg()

    wfs_layer = wfs_ds.GetLayer(0)
    assert wfs_layer is not None, gdal.GetLastErrorMsg()
    assert wfs_layer.GetName() == 'test'


@pytest.mark.parametrize('version, key', product(TEST_WFS_VERSIONS, (
    'null', 'int', 'real', 'string', 'unicode',
    # Date, time and datetime types seem to be broken
    # 'date', 'time', 'datetime',
)))
def test_compare(version, key, features):
    for tst, ref in features(version):
        itst = tst.GetFieldIndex(key)
        iref = ref.GetFieldIndex(key)

        dtst = tst.GetFieldDefnRef(itst)
        dref = ref.GetFieldDefnRef(iref)
        assert tst.IsFieldNull(itst) == ref.IsFieldNull(iref)
        assert ogr.GetFieldTypeName(dtst.GetType()) == ogr.GetFieldTypeName(dref.GetType())

        if dref.GetType() == ogr.OFTReal:
            gname = 'GetFieldAsDouble'
        else:
            gname = 'GetFieldAs' + ogr.GetFieldTypeName(dref.GetType())

        vtst = getattr(tst, gname)(itst)
        vref = getattr(ref, gname)(iref)

        if dtst.GetType() == ogr.OFTReal:
            assert abs(vtst - vref) < 1e-6
        else:
            assert vtst == vref


@pytest.mark.parametrize('version, fields', product(TEST_WFS_VERSIONS, (
    dict(null='not null', int=42, real=-0.0, string=None, unicode='¯\\_(ツ)_/¯', geom='POINT(1 1)'),
    dict(null=None, int=2**16, real=3.1415926535897, string='str', unicode='مرحبا بالعالم', geom='POINT(0.1 -3.1)'),
)))
def test_edit(version, fields, service, ngw_httptest_app, ngw_auth_administrator):
    driver = ogr.GetDriverByName(six.ensure_str('WFS'))
    wfs_ds = driver.Open("WFS:{}/api/resource/{}/wfs?VERSION={}".format(
        ngw_httptest_app.base_url, service, version), True)
    assert wfs_ds is not None, gdal.GetLastErrorMsg()

    wfs_layer = wfs_ds.GetLayer(0)
    assert wfs_layer is not None, gdal.GetLastErrorMsg()

    feature = wfs_layer.GetNextFeature()

    for k, v in fields.items():
        if k == 'geom':
            geom = ogr.CreateGeometryFromWkt(v)
            assert geom is not None, gdal.GetLastErrorMsg()
            feature.SetGeometry(geom)
        elif v is None:
            feature.SetFieldNull(k)
        else:
            feature.SetField(k, v)

    err = wfs_layer.SetFeature(feature)
    assert err == 0, gdal.GetLastErrorMsg()

    vector_layer_id = ngw_httptest_app.get('/api/resource/%d' % service) \
        .json()['wfsserver_service']['layers'][0]['resource_id']

    feature_cmp = ngw_httptest_app.get('/api/resource/%d/feature/1' % vector_layer_id).json()

    for k, v in fields.items():
        if k == 'geom':
            geom_cmp = ogr.CreateGeometryFromWkt(feature_cmp['geom'])
            assert geom_cmp.Equals(geom)
        else:
            v_cmp = feature_cmp['fields'][k]
            if k == 'real' and v is not None:
                assert abs(v_cmp - v) < 1e-6
            else:
                assert v_cmp == v


@pytest.mark.parametrize('version', TEST_WFS_VERSIONS)
def test_create_delete(version, service, ngw_httptest_app, ngw_auth_administrator):
    driver = ogr.GetDriverByName(six.ensure_str('WFS'))
    wfs_ds = driver.Open("WFS:{}/api/resource/{}/wfs?VERSION={}".format(
        ngw_httptest_app.base_url, service, version), True)

    assert wfs_ds is not None, gdal.GetLastErrorMsg()

    wfs_layer = wfs_ds.GetLayer(0)
    assert wfs_layer is not None, gdal.GetLastErrorMsg()

    feature = ogr.Feature(wfs_layer.GetLayerDefn())

    geom = ogr.CreateGeometryFromWkt('POINT(1 1)')
    feature.SetGeometry(geom)

    err = wfs_layer.CreateFeature(feature)
    assert err == 0, gdal.GetLastErrorMsg()
