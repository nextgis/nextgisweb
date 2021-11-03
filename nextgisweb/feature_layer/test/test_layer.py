import json
from datetime import date, datetime, time
from pathlib import Path

import pytest

import nextgisweb.feature_layer.test
from nextgisweb.vector_layer.test import create_feature_layer as create_vector_layer
from nextgisweb.wfsclient.test import create_feature_layer as create_wfs_layer


data_points = Path(nextgisweb.feature_layer.test.__file__).parent / 'data' / 'points.geojson'


def cmp_fields(gjfields, fields):
    assert gjfields.keys() == fields.keys()

    for k, v in fields.items():
        gjv = gjfields[k]
        t = type(v)
        if v is None:
            assert gjv is None
        elif t in (str, int):
            assert gjv == v
        elif t == float:
            assert pytest.approx(gjv) == v
        elif t == date:
            assert date.fromisoformat(gjv) == v
        elif t == time:
            assert time.fromisoformat(gjv) == v
        elif t == datetime:
            assert datetime.fromisoformat(gjv) == v
        else:
            raise NotImplementedError("Can't compare {} type.".format(t))


@pytest.mark.parametrize('create_resource', (
    pytest.param(create_vector_layer, id='Vector layer'),
    pytest.param(create_wfs_layer, id='WFS layer'),
))
def test_layer(create_resource, ngw_resource_group, ngw_auth_administrator, ngw_httptest_app):
    geojson = json.loads(data_points.read_text())
    features = geojson['features']

    with create_resource(data_points, ngw_resource_group, ngw_httptest_app=ngw_httptest_app) as layer:
        query = layer.feature_query()

        # IFeatureQuery

        result = query()
        assert result.total_count == 2
        for i, f in enumerate(result):
            cmp_fields(features[i]['properties'], f.fields)

        # - fields

        fields = ('int', 'string')
        query.fields(*fields)
        for i, f in enumerate(query()):
            gjfields = {k: features[i]['properties'][k] for k in fields}
            cmp_fields(gjfields, f.fields)
