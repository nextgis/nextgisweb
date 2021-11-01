from pathlib import Path
from itertools import product
from uuid import uuid4

import pytest
import transaction
from osgeo import gdal
from osgeo import ogr
from packaging import version as pkg_version

from nextgisweb.models import DBSession
from nextgisweb.auth import User
from nextgisweb.spatial_ref_sys import SRS
from nextgisweb.vector_layer import VectorLayer
from nextgisweb.wfsserver.model import Service as WFSService, Layer as WFSLayer


TEST_WFS_VERSIONS = ('2.0.2', '2.0.0', '1.1.0', '1.0.0', )


def type_geojson_dataset(filename):
    import nextgisweb.vector_layer.test
    path = Path(nextgisweb.vector_layer.test.__file__).parent / 'data' / filename
    result = ogr.Open(str(path))
    assert result is not None, gdal.GetLastErrorMsg()
    return result


@pytest.fixture(scope='module')
def service(ngw_resource_group):
    with transaction.manager:
        vl_type = VectorLayer(
            parent_id=ngw_resource_group, display_name='type',
            owner_user=User.by_keyname('administrator'),
            srs=SRS.filter_by(id=3857).one(),
            tbl_uuid=uuid4().hex,
        ).persist()

        dsource = type_geojson_dataset('type.geojson')
        layer = dsource.GetLayer(0)

        vl_type.setup_from_ogr(layer)
        vl_type.load_from_ogr(layer)

        DBSession.flush()

        # NOTE: GDAL doesn't support time fields in GML / WFS. It completely breaks
        # XSD schema parsing. Delete the time field to pass tests.
        DBSession.delete(vl_type.field_by_keyname('time'))

        vl_pointz = VectorLayer(
            parent_id=ngw_resource_group, display_name='pointz',
            owner_user=User.by_keyname('administrator'),
            srs=SRS.filter_by(id=3857).one(),
            tbl_uuid=uuid4().hex,
        ).persist()

        dsource = type_geojson_dataset('pointz.geojson')
        layer = dsource.GetLayer(0)

        vl_pointz.setup_from_ogr(layer)
        vl_pointz.load_from_ogr(layer)

        DBSession.flush()

        res_wfs = WFSService(
            parent_id=ngw_resource_group, display_name='test_wfsserver_service',
            owner_user=User.by_keyname('administrator'),
        ).persist()

        res_wfs.layers.extend((
            WFSLayer(resource=vl_type, keyname='type', display_name='type', maxfeatures=1000),
            WFSLayer(resource=vl_pointz, keyname='pointz', display_name='pointz', maxfeatures=1000),
        ))

        DBSession.flush()

        DBSession.expunge(vl_type)
        DBSession.expunge(vl_pointz)
        DBSession.expunge(res_wfs)

    yield res_wfs.id

    with transaction.manager:
        DBSession.delete(VectorLayer.filter_by(id=vl_type.id).one())
        DBSession.delete(VectorLayer.filter_by(id=vl_pointz.id).one())
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

            ref_ds = type_geojson_dataset('type.geojson')
            ref_layer = ref_ds.GetLayer(0)

            factory._cache[version] = (
                list(zip(wfs_layer, ref_layer)),
                wfs_ds, ref_ds,  # Just for keep GDAL references
            )

        return factory._cache[version][0]

    return factory


@pytest.mark.parametrize('version', TEST_WFS_VERSIONS)
def test_layer_name(version, service, ngw_httptest_app, ngw_auth_administrator):
    driver = ogr.GetDriverByName('WFS')
    wfs_ds = driver.Open("WFS:{}/api/resource/{}/wfs?VERSION={}".format(
        ngw_httptest_app.base_url, service, version), True)
    assert wfs_ds is not None, gdal.GetLastErrorMsg()

    wfs_layer = wfs_ds.GetLayer(0)
    assert wfs_layer is not None, gdal.GetLastErrorMsg()
    assert wfs_layer.GetName() == 'type'

    wfs_layer = wfs_ds.GetLayer(1)
    assert wfs_layer is not None, gdal.GetLastErrorMsg()
    assert wfs_layer.GetName() == 'pointz'


@pytest.mark.parametrize('version, key', product(TEST_WFS_VERSIONS, (
    'null', 'int', 'real', 'string', 'unicode', 'date', 'datetime',
    # Time fields seem to be borken in GDAL and are removed from data
)))
def test_compare(version, key, features):
    for tst, ref in features(version):
        itst = tst.GetFieldIndex(key)
        iref = ref.GetFieldIndex(key)

        dtst = tst.GetFieldDefnRef(itst)
        dref = ref.GetFieldDefnRef(iref)
        assert tst.IsFieldNull(itst) == ref.IsFieldNull(iref)

        tp_tst, tp_ref = dtst.GetType(), dref.GetType()
        if tp_tst == ogr.OFTString and tp_ref == ogr.OFTDate:
            vref = ref.GetFieldAsString(iref).replace('/', '-')
            assert tst.GetFieldAsString(itst) == vref
        elif tp_tst == ogr.OFTString and tp_ref == ogr.OFTDateTime:
            vref = ref.GetFieldAsString(iref).replace('/', '-').replace(' ', 'T')
            assert tst.GetFieldAsString(itst) == vref
        else:
            tn_tst = ogr.GetFieldTypeName(dtst.GetType())
            tn_ref = ogr.GetFieldTypeName(dref.GetType())
            assert tn_tst == tn_ref, "Field type mismatch"

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


test_create_delete_params = []
test_edit_params = []

for version in TEST_WFS_VERSIONS:
    for layer in ('type', 'pointz'):
        if layer == 'type':
            test_edit_params.append(pytest.param(
                version, layer, dict(
                    null='not null', int=42, real=-0.0,
                    string=None, unicode='¯\\_(ツ)_/¯'
                ), 'POINT (1 1)',
                id='{}-type-f1'.format(version),
            ))
            test_edit_params.append(pytest.param(
                version, layer, dict(
                    null=None, int=2**16, real=3.1415926535897,
                    string='str', unicode='مرحبا بالعالم',
                ), 'POINT (0.1 -3.1)',
                id='{}-type-f2'.format(version),
            ))
        elif layer == 'pointz':
            test_edit_params.append(pytest.param(
                version, layer, dict(int=42), 'POINT Z (0 0 -1)',
                id='{}-points-f1'.format(version),
            ))

        test_create_delete_params.append(pytest.param(
            version, layer, 'POINT Z (0 0 -1)' if layer == 'pointz' else 'POINT (0 0)',
            id="{}-{}".format(version, layer),
            marks=pytest.mark.xfail(
                version >= '2.0.0' and pkg_version.parse(gdal.__version__) < pkg_version.parse('3.2.1'),
                reason="GDAL doesn't work correctly with WFS 2.x"
            ),
        ))

@pytest.mark.parametrize('version, layer, fields, wkt', test_edit_params)
def test_edit(version, layer, fields, wkt, service, ngw_httptest_app, ngw_auth_administrator):
    driver = ogr.GetDriverByName('WFS')
    wfs_ds = driver.Open("WFS:{}/api/resource/{}/wfs?VERSION={}".format(
        ngw_httptest_app.base_url, service, version), True)
    assert wfs_ds is not None, gdal.GetLastErrorMsg()

    wfs_layer = wfs_ds.GetLayerByName(layer)
    assert wfs_layer is not None, gdal.GetLastErrorMsg()

    feature = wfs_layer.GetNextFeature()
    geom = ogr.CreateGeometryFromWkt(wkt)
    feature.SetGeometry(geom)

    for k, v in fields.items():
        if v is None:
            feature.SetFieldNull(k)
        else:
            feature.SetField(k, v)

    err = wfs_layer.SetFeature(feature)
    assert err == 0, gdal.GetLastErrorMsg()

    wfs_service_layers = ngw_httptest_app.get('/api/resource/%d' % service) \
        .json()['wfsserver_service']['layers']

    for sl in wfs_service_layers:
        if sl['keyname'] == layer:
            vector_layer_id = sl['resource_id']

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


@pytest.mark.parametrize('version, layer, wkt', test_create_delete_params)
def test_create_delete(version, layer, wkt, service, ngw_httptest_app, ngw_auth_administrator):
    driver = ogr.GetDriverByName('WFS')
    wfs_ds = driver.Open("WFS:{}/api/resource/{}/wfs?VERSION={}".format(
        ngw_httptest_app.base_url, service, version), True)

    assert wfs_ds is not None, gdal.GetLastErrorMsg()

    wfslayer_type = wfs_ds.GetLayerByName(layer)
    assert wfslayer_type is not None, gdal.GetLastErrorMsg()

    feature = ogr.Feature(wfslayer_type.GetLayerDefn())

    geom = ogr.CreateGeometryFromWkt(wkt)
    feature.SetGeometry(geom)

    err = wfslayer_type.CreateFeature(feature)
    assert err == 0, gdal.GetLastErrorMsg()

    fid = feature.GetFID()
    err = wfslayer_type.DeleteFeature(fid)
    assert err == 0, gdal.GetLastErrorMsg()
