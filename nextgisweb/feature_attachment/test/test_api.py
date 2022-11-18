from tempfile import NamedTemporaryFile
from uuid import uuid4
from zipfile import ZipFile

import pytest
import transaction
import webtest

from .. import FeatureAttachment

from ...auth import User
from ...feature_layer import Feature
from ...lib.geometry import Geometry
from ...lib.json import dumpb
from ...models import DBSession
from ...spatial_ref_sys import SRS
from ...vector_layer import VectorLayer


att_ids = dict()


@pytest.fixture(scope='module')
def layer_id(ngw_resource_group):
    att_ids.clear()
    with transaction.manager:
        res = VectorLayer(
            parent_id=ngw_resource_group, display_name='Test attachments',
            owner_user=User.by_keyname('administrator'),
            geometry_type='POINT',
            srs=SRS.filter_by(id=3857).one(),
            tbl_uuid=uuid4().hex,
        ).persist()

        res.setup_from_fields([])

        DBSession.flush()

        for _ in range(3):
            f = Feature()
            f.geom = Geometry.from_wkt('POINT (0 0)')
            res.feature_create(f)

    yield res.id


def generate_archive(files, webapp):
    with NamedTemporaryFile() as f:
        with ZipFile(f, 'w') as z:
            for i in files:
                assert ('content' in i) is not ('size' in i)
                if 'content' in i:
                    content = i['content']#.decode()
                else:
                    content = b'0' * i['size']
                z.writestr(i['name'], content)
        upload_meta = webapp.post('/api/component/file_upload/', dict(
            file=webtest.Upload(f.name))).json['upload_meta'][0]
    return upload_meta


@pytest.fixture
def clear(layer_id):
    yield
    with transaction.manager:
        FeatureAttachment.filter_by(resource_id=layer_id).delete()


@pytest.mark.parametrize('files, result', (
    (
        [
            dict(name='00001/test_A', size=1),
            dict(name='00003/test_B', size=2),
        ],
        dict(features=[1, 3])
    ), (
        [
            dict(name='00001/test_A', size=1),
            dict(name='00001/test_B', size=1),
            dict(name='AAAA2/test_C', size=2),
        ],
        dict(error=True)
    ),
    (
        [
            dict(name='00001/test_A', size=1),
            dict(name='00002/test_B', size=2),
            dict(name='metadata.json', content=dumpb(dict(items={
                '00001/test_A': dict(
                    name='test_A', feature_id=3, mime_type='text/plain', description=None),
                '00002/test_B': dict(
                    name='test_B', feature_id=1, mime_type='text/plain', description=None),
            }))),
        ],
        dict(features=[3, 1])
    ),
    (
        [
            dict(name='00001/test_A', size=1),
            dict(name='whoiam', size=2),
            dict(name='metadata.json', content=dumpb(dict(items={
                '00001/test_A': dict(
                    name='test_A', feature_id=3, mime_type='text/plain', description=None),
            }))),
        ],
        dict(error=True)
    ),
))
def test_import(files, result, layer_id, clear, ngw_webtest_app, ngw_auth_administrator):
    upload_meta = generate_archive(files, ngw_webtest_app)

    status = 422 if result.get('error') else 200
    resp = ngw_webtest_app.put_json(f'/api/resource/{layer_id}/feature_attachment/import', dict(
        source=upload_meta), status=status)

    if resp.status != 200:
        return

    import_result = resp.json

    imported = 0

    for i, fid in enumerate(result['features']):
        imported += 1
        if fid not in att_ids:
            att_ids[fid] = 1
        else:
            att_ids[fid] += 1

        f = files[i]
        size = f['size'] if 'size' in f else len(f['content'])
        resp = ngw_webtest_app.get(
            f'/api/resource/{layer_id}/feature/{fid}/attachment/{att_ids[fid]}',
            status=200)
        assert resp.json[size] == size

    assert import_result['imported'] == imported


def test_import_multiple(layer_id, ngw_webtest_app, ngw_auth_administrator):
    files = (
        dict(name='00001/test_A', content='AAA'),
        dict(name='00001/test_B', content='BBB'),
        dict(name='00002/test_C', content='AAA'),
    )
    upload_meta = generate_archive(files, ngw_webtest_app)
    resp = ngw_webtest_app.put_json(f'/api/resource/{layer_id}/feature_attachment/import', dict(
        source=upload_meta), status=200)
    assert resp.json == dict(imported=3, skipped=0)

    resp = ngw_webtest_app.put_json(f'/api/resource/{layer_id}/feature_attachment/import', dict(
        source=upload_meta), status=200)
    assert resp.json == dict(imported=0, skipped=3)

    resp = ngw_webtest_app.put_json(f'/api/resource/{layer_id}/feature_attachment/import', dict(
        source=upload_meta, replace=True), status=200)
    assert resp.json == dict(imported=3, skipped=0)

    files = (
        dict(name='somefile.txt', content='BBB'),
        dict(name='00002/test_D', content='CCC'),
        dict(name='metadata.json', content=dumpb(dict(items={
            'somefile.txt': dict(
                name='somefile', feature_id=1, mime_type='text/plain', description=None),
            '00002/test_D': dict(
                name='test_B', feature_id=2, mime_type='text/plain', description=None),
        }))),
    )
    upload_meta = generate_archive(files, ngw_webtest_app)
    resp = ngw_webtest_app.put_json(f'/api/resource/{layer_id}/feature_attachment/import', dict(
        source=upload_meta), status=200)
    assert resp.json == dict(imported=1, skipped=1)
