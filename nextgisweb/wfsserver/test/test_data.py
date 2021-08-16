# -*- coding: utf-8 -*-
from __future__ import division, absolute_import, print_function, unicode_literals

import json
from uuid import uuid4

import pytest
import six
import transaction
from osgeo import gdal, ogr

from nextgisweb.auth import User
from nextgisweb.models import DBSession
from nextgisweb.spatial_ref_sys import SRS
from nextgisweb.vector_layer import VectorLayer
from nextgisweb.wfsserver.model import Service as WFSService, Layer as WFSLayer


TEST_WFS_VERSIONS = ('2.0.2', '2.0.0', '1.1.0', '1.0.0', )


@pytest.fixture(scope='module')
def vlayer_id(ngw_resource_group):
    with transaction.manager:
        res_vl = VectorLayer(
            parent_id=ngw_resource_group, display_name='test_cyrillic',
            owner_user=User.by_keyname('administrator'),
            srs=SRS.filter_by(id=3857).one(),
            tbl_uuid=six.text_type(uuid4().hex),
        ).persist()

        geojson = {
            'type': 'FeatureCollection',
            'crs': {'type': 'name', 'properties': {'name': 'urn:ogc:def:crs:EPSG::3857'}},
            'features': [{
                'type': 'Feature',
                'properties': {'field1': 1, 'поле2': 'значение1'},
                'geometry': {'type': 'Point', 'coordinates': [0, 0]}
            }, {
                'type': 'Feature',
                'properties': {'field1': 2, 'поле2': 'значение2'},
                'geometry': {'type': 'Point', 'coordinates': [10, 10]}
            }]
        }
        dsource = ogr.Open(json.dumps(geojson))
        layer = dsource.GetLayer(0)

        res_vl.setup_from_ogr(layer)
        res_vl.load_from_ogr(layer)

        DBSession.flush()

        DBSession.expunge(res_vl)

    yield res_vl.id

    with transaction.manager:
        DBSession.delete(VectorLayer.filter_by(id=res_vl.id).one())


@pytest.fixture(scope='module')
def service_id(vlayer_id, ngw_resource_group):
    with transaction.manager:
        res_wfs = WFSService(
            parent_id=ngw_resource_group, display_name='test_cyrillic_service',
            owner_user=User.by_keyname('administrator'),
        ).persist()

        res_wfs.layers.append(WFSLayer(
            resource_id=vlayer_id, keyname='test',
            display_name='test', maxfeatures=1000,
        ))

        DBSession.flush()

        DBSession.expunge(res_wfs)

    yield res_wfs.id

    with transaction.manager:
        DBSession.delete(WFSService.filter_by(id=res_wfs.id).one())


def test_cyrillic(service_id, vlayer_id, ngw_httptest_app, ngw_auth_administrator):
    driver = ogr.GetDriverByName(six.ensure_str('WFS'))
    wfs_ds = driver.Open('WFS:{}/api/resource/{}/wfs'.format(
        ngw_httptest_app.base_url, service_id), True)

    assert wfs_ds is not None, gdal.GetLastErrorMsg()

    layer = wfs_ds.GetLayer(0)

    defn = layer.GetLayerDefn()
    assert defn.GetFieldCount() == 3

    field_idxs = list(range(3))
    field_idxs.remove(defn.GetGeomFieldIndex('geom'))
    field_idxs.remove(defn.GetFieldIndex('field1'))
    assert len(field_idxs) == 1

    field = defn.GetFieldDefn(field_idxs[0])
    name = field.GetName()
    assert name.startswith('wfsfld_')

    feature = layer.GetFeature(1)
    value = 'test value!'
    feature.SetField(name, value)

    err = layer.SetFeature(feature)
    assert err == 0, gdal.GetLastErrorMsg()

    feature_cmp = ngw_httptest_app.get('/api/resource/%s/feature/1' % vlayer_id).json()
    assert feature_cmp['fields']['поле2'] == value
