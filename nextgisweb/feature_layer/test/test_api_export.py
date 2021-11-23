from uuid import uuid4
import json
from string import ascii_letters, printable

import pytest
import transaction
from osgeo import ogr

from ...models import DBSession
from ...auth import User
from ...spatial_ref_sys import SRS
from ...vector_layer import VectorLayer


@pytest.fixture(scope='module')
def layer_id(ngw_resource_group):
    with transaction.manager:
        obj = VectorLayer(
            parent_id=ngw_resource_group, display_name='vector_layer',
            owner_user=User.by_keyname('administrator'),
            srs=SRS.filter_by(id=3857).one(),
            tbl_uuid=uuid4().hex,
        ).persist()

        geojson = {
            "type": "FeatureCollection",
            "features": [
                {
                    "type": "Feature",
                    "properties": {"field": "value"},
                    "geometry": {
                        "type": "Point",
                        "coordinates": [0, 0],
                    },
                },
            ],
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


@pytest.fixture()
def update_field(layer_id, ngw_webtest_app, ngw_auth_administrator):

    def wrapped(**field):
        if 'keyname' not in field:
            field['keyname'] = 'keyname'
        if 'display_name' not in field:
            field['display_name'] = 'display_name'

        resp = ngw_webtest_app.get(f'/api/resource/{layer_id}')
        fields = resp.json['feature_layer']['fields']
        assert len(fields) == 1

        fields[0].update(field)
        ngw_webtest_app.put_json(f'/api/resource/{layer_id}', dict(
            feature_layer=dict(fields=fields)))
    
    return wrapped


@pytest.fixture()
def export_geojson(layer_id, ngw_webtest_app, ngw_auth_administrator):

    def wrapped(display_name=False, fid=None):
        qs = dict(
            format='GeoJSON', srs='4326', zipped='false',
            display_name=str(display_name).lower())
        if fid is not None:
            qs['fid'] = fid
        resp = ngw_webtest_app.get(f'/api/resource/{layer_id}/export', qs)
        return resp.json
    
    return wrapped


@pytest.mark.parametrize('value', [
    pytest.param(ascii_letters, id='letters'),
    pytest.param(printable, id='printable'),
    pytest.param("юникод", id='unicode'),
    pytest.param("new\nline", id='newline'),
    pytest.param("\r\t\\n", id='escape'),
    pytest.param("'single'", id='single'),
    pytest.param('"single"', id='double'),
    pytest.param('FID', id='fid'),
    pytest.param('COUNT(*)', id='count'),
])
def test_field_escape(value, update_field, export_geojson):
    update_field(keyname=value)
    geojson = export_geojson(display_name=False)       
    fprop = geojson['features'][0]['properties']
    assert fprop[value] == 'value'

    update_field(display_name=value)
    geojson = export_geojson(display_name=True)
    fprop = geojson['features'][0]['properties']
    assert fprop[value] == 'value'
