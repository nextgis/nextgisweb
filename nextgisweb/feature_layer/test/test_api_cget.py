# -*- coding: utf-8 -*-
from __future__ import division, absolute_import, print_function, unicode_literals
import random
import json
import six
from uuid import uuid4

import pytest
import transaction
from osgeo import ogr

from nextgisweb.models import DBSession

from nextgisweb.vector_layer import VectorLayer
from nextgisweb.spatial_ref_sys.models import SRS
from nextgisweb.auth import User


check_list = [
    ['int', [5, 4, 1, 2, 3]],
    # ['+int', [5, 4, 1, 2, 3]], "+" is an unwanted parameter for url str
    ['-int', [3, 1, 2, 4, 5]],
    ['string', [1, 5, 4, 2, 3]],
    ['-string', [2, 3, 4, 5, 1]],
    ['int,-string', [5, 4, 2, 1, 3]],
    ['string,-int', [1, 5, 4, 3, 2]],
    ['-string,-int', [3, 2, 4, 5, 1]],
    # ['unexist', []], Error
]


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
            'type': 'FeatureCollection',
            'features': get_features_for_orderby_test()
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


@pytest.mark.parametrize('order_by, check', check_list)
def test_cget_order(ngw_webtest_app, vector_layer_id, order_by, check):
    ngw_webtest_app.authorization = ('Basic', ('administrator', 'admin'))  # FIXME:

    resp = ngw_webtest_app.get(
        "/api/resource/%d/feature/?order_by=%s" % (vector_layer_id, order_by)
    )
    ids = [f["id"] for f in resp.json]
    assert ids == check, 'order_by=%s' % order_by


def get_features_for_orderby_test():
    import string
    from random import randint

    letters = string.ascii_lowercase
    ''.join(random.choice(letters) for i in range(randint(0, 50)))
    params = [
        [1, ''],
        [1, 'foo'],
        [2, 'foo'],
        [0, 'bar'],
        [-3, 'BAZ']
    ]
    features = []
    for num, text in params:
        feature = {
            "type": "Feature",
            "geometry": {"type": "Point", "coordinates": [0.0, 0.0]},
            "properties": {
                "int": num,
                "string": text
            }
        }
        features.append(feature)

    return features
