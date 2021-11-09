import json
from datetime import date, datetime, time
from pathlib import Path

import pytest

import nextgisweb.feature_layer.test
from nextgisweb.lib.geometry import Geometry, Transformer
from nextgisweb.spatial_ref_sys import SRS
from nextgisweb.spatial_ref_sys.models import WKT_EPSG_4326
from nextgisweb.vector_layer.test import create_feature_layer as create_vector_layer
from nextgisweb.wfsclient.test import create_feature_layer as create_wfs_layer


data_points = Path(nextgisweb.feature_layer.test.__file__).parent / 'data' / 'points.geojson'


def cmp_fields(gj_fields, fields):
    assert gj_fields.keys() == fields.keys()

    for k, v in fields.items():
        gjv = gj_fields[k]
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


def cmp_geom(gj_geom, geom2, srs):
    geom1 = Geometry.from_geojson(gj_geom)
    if srs.id != 4326:
        t = Transformer(WKT_EPSG_4326, srs.wkt)
        geom1 = t.transform(geom1)
    g1 = geom1.shape
    g2 = geom2.shape
    assert g1.almost_equals(g2)


@pytest.mark.parametrize('create_resource', (
    pytest.param(create_vector_layer, id='Vector layer'),
    pytest.param(create_wfs_layer, id='WFS layer'),
))
def test_layer(create_resource, ngw_resource_group, ngw_auth_administrator, ngw_httptest_app):
    geojson = json.loads(data_points.read_text())
    gj_fs = geojson['features']

    with create_resource(data_points, ngw_resource_group, ngw_httptest_app=ngw_httptest_app) as layer:

        # IFeatureQuery

        query = layer.feature_query()
        result = query()
        assert result.total_count == len(gj_fs)
        for i, f in enumerate(result):
            cmp_fields(gj_fs[i]['properties'], f.fields)
            assert f.geom is None

        # - fields
        fields = ('int', 'string')
        query = layer.feature_query()
        query.fields(*fields)
        for i, f in enumerate(query()):
            gjfields = {k: gj_fs[i]['properties'][k] for k in fields}
            cmp_fields(gjfields, f.fields)

        # - limit
        limit = 1
        query = layer.feature_query()
        query.limit(limit)
        fs = list(query())
        assert len(fs) == limit
        cmp_fields(gj_fs[limit - 1]['properties'], fs[limit - 1].fields)

        offset = 1
        query = layer.feature_query()
        query.limit(limit, offset)
        fs = list(query())
        assert len(fs) == limit
        cmp_fields(gj_fs[offset + limit - 1]['properties'], fs[limit - 1].fields)

        # - geom
        query = layer.feature_query()
        query.geom()
        for i, f in enumerate(query()):
            cmp_geom(gj_fs[i]['geometry'], f.geom, layer.srs)

        # - srs
        srs = SRS.filter_by(id=4326).one()
        query = layer.feature_query()
        query.geom()
        query.srs(srs)
        for i, f in enumerate(query()):
            cmp_geom(gj_fs[i]['geometry'], f.geom, srs)
