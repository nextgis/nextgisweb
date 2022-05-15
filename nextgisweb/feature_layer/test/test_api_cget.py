import random
import json
from uuid import uuid4

import pytest
import transaction
from osgeo import ogr

from ...models import DBSession
from ...vector_layer import VectorLayer
from ...spatial_ref_sys.model import SRS
from ...auth import User


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
def vector_layer_id(ngw_resource_group):
    with transaction.manager:
        obj = VectorLayer(
            parent_id=ngw_resource_group, display_name='vector_layer',
            owner_user=User.by_keyname('administrator'),
            srs=SRS.filter_by(id=3857).one(),
            tbl_uuid=uuid4().hex,
        ).persist()

        geojson = {
            'type': 'FeatureCollection',
            'features': get_features_for_orderby_test()
        }
        dsource = ogr.Open(json.dumps(geojson))
        layer = dsource.GetLayer(0)

        obj.setup_from_ogr(layer)
        obj.load_from_ogr(layer)

        DBSession.flush()
        DBSession.expunge(obj)

    yield obj.id

    with transaction.manager:
        DBSession.delete(VectorLayer.filter_by(id=obj.id).one())


@pytest.mark.parametrize('order_by, check', check_list)
def test_cget_order(ngw_webtest_app, vector_layer_id, order_by, check, ngw_auth_administrator):
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
            },
            "label": "label"
        }
        features.append(feature)

    return features


def test_cget_extensions(ngw_webtest_app, vector_layer_id, ngw_auth_administrator):
    resp = ngw_webtest_app.get('/api/resource/%d/feature/' % vector_layer_id)
    assert len(resp.json[0]['extensions'].keys()) > 0

    resp = ngw_webtest_app.get('/api/resource/%d/feature/?extensions=' % vector_layer_id)
    assert len(resp.json[0]['extensions'].keys()) == 0

    resp = ngw_webtest_app.get('/api/resource/%d/feature/?extensions=description,attachment' % vector_layer_id)
    assert resp.json[0]['extensions'] == dict(description=None, attachment=None)


def test_there_is_no_label_by_default(ngw_webtest_app, vector_layer_id, ngw_auth_administrator):
    resp = ngw_webtest_app.get('/api/resource/%d/feature/' % vector_layer_id)
    assert 'label' not in resp.json[0]


def test_return_label_by_parameter(ngw_webtest_app, vector_layer_id, ngw_auth_administrator):
    resp = ngw_webtest_app.get('/api/resource/%d/feature/?label=true' % vector_layer_id)
    assert 'label' in resp.json[0]
