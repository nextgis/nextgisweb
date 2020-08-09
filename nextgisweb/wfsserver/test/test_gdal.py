# -*- coding: utf-8 -*-
from __future__ import division, absolute_import, print_function, unicode_literals
import six
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
    if not hasattr(features, '_cached_result'):
        wfs_ds = ogr.Open('WFS:' + ngw_httptest_app.base_url + '/api/resource/{}/wfs'.format(
            service))
        assert wfs_ds is not None, gdal.GetLastErrorMsg()

        wfs_layer = wfs_ds.GetLayer(0)
        assert wfs_layer is not None, gdal.GetLastErrorMsg()

        ref_ds = type_geojson_dataset()
        ref_layer = ref_ds.GetLayer(0)

        features._cached_result = list(zip(wfs_layer, ref_layer))
        features._wfs_ds = wfs_ds  # Keep GDAL references
        features._ref_ds = ref_ds  # Keep GDAL references

    yield features._cached_result


@pytest.mark.parametrize('key', (
    'null',
    'int',
    'real',
    'date',
    'time',
    'datetime',
    'string',
    'unicode',
))
def test_compare(key, features):
    for a, b in features:
        ia = a.GetFieldIndex(key)
        ib = b.GetFieldIndex(key)

        da = a.GetFieldDefnRef(ia)
        db = b.GetFieldDefnRef(ib)
        assert ogr.GetFieldTypeName(da.GetType()) == ogr.GetFieldTypeName(db.GetType())
        assert a.IsFieldNull(ia) == b.IsFieldNull(ib)

        if da.GetType() == ogr.OFTReal:
            gname = 'GetFieldAsDouble'
        else:
            gname = 'GetFieldAs' + ogr.GetFieldTypeName(da.GetType())

        va = getattr(a, gname)(ia)
        vb = getattr(b, gname)(ib)

        if da.GetType() == ogr.OFTReal:
            assert va - vb < 1e-6
        else:
            assert va == vb
