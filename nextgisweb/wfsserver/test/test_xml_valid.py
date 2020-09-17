# -*- coding: utf-8 -*-
from __future__ import division, absolute_import, print_function, unicode_literals

import json
import os
from lxml import etree
from uuid import uuid4

import pytest
import six
import transaction
from osgeo import ogr

from nextgisweb.auth import User
from nextgisweb.models import DBSession
from nextgisweb.spatial_ref_sys import SRS
from nextgisweb.vector_layer import VectorLayer
from nextgisweb.wfsserver.model import Service as WFSService, Layer as WFSLayer


@pytest.fixture(scope='module')
def service_id(ngw_resource_group):
    with transaction.manager:
        res_vl = VectorLayer(
            parent_id=ngw_resource_group, display_name='test_vector_layer',
            owner_user=User.by_keyname('administrator'),
            srs=SRS.filter_by(id=3857).one(),
            tbl_uuid=six.text_type(uuid4().hex),
        ).persist()

        geojson = {
            'type': 'FeatureCollection',
            'crs': {'type': 'name', 'properties': {'name': 'urn:ogc:def:crs:EPSG::3857'}},
            'features': [{
                'type': 'Feature',
                'properties': {'name': 'feature1'},
                'geometry': {'type': 'Point', 'coordinates': [0, 0]}
            }, {
                'type': 'Feature',
                'properties': {'price': -1},
                'geometry': {'type': 'Point', 'coordinates': [10, 10]}
            }]
        }
        dsource = ogr.Open(json.dumps(geojson))
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


@pytest.mark.skip()
@pytest.mark.parametrize('version, schema', (
    ('2.0.0', 'http://schemas.opengis.net/wfs/2.0/wfs.xsd'),
    ('1.0.0', 'http://schemas.opengis.net/wfs/1.0.0/WFS-capabilities.xsd'),
))
def test_xml_valid(version, schema, service_id, ngw_webtest_app, ngw_auth_administrator):
    resp = ngw_webtest_app.get('/api/resource/%d/wfs' % service_id, dict(
        request='GetCapabilities',
        version=version,
    ))

    schema = etree.XMLSchema(etree.parse(schema))

    parser = etree.XMLParser(schema=schema)
    etree.fromstring(resp.text.encode('utf-8'), parser=parser)
