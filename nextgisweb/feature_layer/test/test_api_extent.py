# -*- coding: utf-8 -*-
from __future__ import division, absolute_import, print_function, unicode_literals
import json
import six

import pytest
import transaction
from uuid import uuid4
from osgeo import ogr

from nextgisweb.models import DBSession
from nextgisweb.vector_layer import VectorLayer
from nextgisweb.spatial_ref_sys.models import SRS
from nextgisweb.auth import User


@pytest.fixture(scope='module')
def vector_layer_id():
    with transaction.manager:

        obj = VectorLayer(
            parent_id=0, display_name='vector_layer',
            owner_user=User.by_keyname('administrator'),
            srs=SRS.filter_by(id=3857).one(),
            tbl_uuid=six.text_type(uuid4().hex),
        ).persist()

        geojson = {
            "type": "FeatureCollection",
            "name": "polygon_extent",
            "crs": {"type": "name", "properties": {"name": "urn:ogc:def:crs:EPSG::3857"}},
            "features": [
                {
                    "type": "Feature",
                    "properties": {"name": "west"},
                    "geometry": {
                        "type": "Polygon",
                        "coordinates": [[
                            [5542180, 8799167],
                            [6191082, 7551279],
                            [4668659, 7126998],
                            [5542180, 8799167],
                        ]],
                    },
                },
                {
                    "type": "Feature",
                    "properties": {"name": "east"},
                    "geometry": {
                        "type": "Polygon",
                        "coordinates": [[
                            [15100999, 10396463],
                            [16498633, 10546209],
                            [16673337, 9223449],
                            [15175872, 8948913],
                            [15100999, 10396463],
                        ]],
                    },
                },
            ],
        }

        dsource = ogr.Open(json.dumps(geojson))
        layer = dsource.GetLayer(0)

        obj.setup_from_ogr(layer, lambda x: x)
        obj.load_from_ogr(layer, lambda x: x)

        DBSession.flush()
        DBSession.expunge(obj)

    yield obj.id

    with transaction.manager:
        DBSession.delete(VectorLayer.filter_by(id=obj.id).one())


item_one_extent = {
    'minLat': 53.7714928132034,
    'maxLat': 61.7460098580695,
    'minLon': 41.9392773604216,
    'maxLon': 55.6154358583725,
}

item_two_extent = {
    'minLat': 62.3762455754066,
    'maxLat': 68.3314641781765,
    'minLon': 135.654582071736,
    'maxLon': 149.779134643755,
}

item_check_list = [
    [1, item_one_extent],
    [2, item_two_extent]
]


@pytest.mark.parametrize('fid, extent', item_check_list)
def test_item_extent(ngw_webtest_app, vector_layer_id, extent, fid):
    ngw_webtest_app.authorization = ('Basic', ('administrator', 'admin'))  # FIXME:
    req_str = '/api/resource/%d/feature/%d/extent' % (vector_layer_id, fid)
    resp = ngw_webtest_app.get(req_str)
    assert extent == resp.json['extent']
