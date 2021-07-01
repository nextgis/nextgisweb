# -*- coding: utf-8 -*-
from __future__ import division, absolute_import, print_function, unicode_literals
import six
import os.path
import pytest
from uuid import uuid4
from osgeo import ogr

from nextgisweb.models import DBSession
from nextgisweb.auth import User
from nextgisweb.spatial_ref_sys import SRS
from nextgisweb.vector_layer import VectorLayer


DATA_PATH = os.path.join(os.path.dirname(
    os.path.abspath(__file__)), 'data')


# key, operator, should_be_true, should_be_false
check_list = [
    ['int', 'eq', [-1], [0, 1]],
    ['int', 'ne', [0, 1], [-1]],
    ['int', 'ge', [-1, -100], [0, 2]],
    ['int', 'gt', [-2], [-1, 2]],
    ['int', 'le', [0, -1], [-2]],
    ['int', 'lt', [2], [-2, -1]],
    ['real', 'eq', [0.33333333333333298], [0.3333333333333329]],
    ['real', 'ne', [0.3333333333333329], [0.33333333333333298]],
    ['int', 'in', ['-1,2,3', '-1'], ['1,2,3']],
    ['int', 'notin', ['1,2,3'], ['-1,2,3', '-1']],
    ['string', 'eq', ['Foo bar'], ['Foo', 'bar', 'foo bar']],
    ['string', 'ne', ['Foo', 'bar', 'foo bar'], ['Foo bar']],
    ['string', 'in', ['Foo bar,2,3'], ['Foo, bar', 'bar', 'foo bar, baz']],
    ['string', 'notin', ['Foo, bar', 'bar', 'foo bar, baz'], ['Foo bar,2,3']],
    ['string', 'like', ['Foo%', '%bar', '%ba%'], ['bar%', 'foo%']],
    ['string', 'ilike', ['foo%', '%BAR', '%bA%'], ['bar%', '%foo']],
    ['id', 'eq', [1], [0, 2]],
    ['id', 'le', [1, 2], [0]],
    ['id', 'gt', [0], [1, 2]],
    ['id', 'in', ['0,1,2'], ['0,2']],
    ['id', 'notin', ['0,2'], ['1']],
]

tests = []

for key, operator, should_be_true, should_be_false in check_list:
    def add_param(v, length):
        filter_ = [key, operator, v]
        tests.append(pytest.param(filter_, length, id='{} {} {{{}}}'.format(key, operator, v)))

    for v in should_be_true:
        add_param(v, 1)
    for v in should_be_false:
        add_param(v, 0)


@pytest.fixture
def resource(ngw_txn, ngw_resource_group):
    src = os.path.join(DATA_PATH, 'geojson-point.zip/layer.geojson')
    dsource = ogr.Open('/vsizip/' + src)
    layer = dsource.GetLayer(0)

    resource = VectorLayer(
        parent_id=ngw_resource_group, display_name='from_ogr',
        owner_user=User.by_keyname('administrator'),
        srs=SRS.filter_by(id=3857).one(),
        tbl_uuid=six.text_type(uuid4().hex),
    )

    resource.persist()

    resource.setup_from_ogr(layer, lambda x: x)
    resource.load_from_ogr(layer, lambda x: x)

    DBSession.flush()
    return resource


@pytest.mark.parametrize('filter_, length', tests)
def test_filter(filter_, length, resource, ngw_txn):
    query = resource.feature_query()
    query.limit(1)
    feature = query().one()
    key = filter_[0]
    filtered_value = feature.id if key == 'id' else feature.fields[key]

    query_filter = resource.feature_query()
    query_filter.filter(filter_)
    msg = "%s for '%s' should be %s" % (filter_, filtered_value, length)
    assert query_filter().total_count == length, msg
