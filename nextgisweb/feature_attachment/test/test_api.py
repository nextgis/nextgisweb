import shutil
from pathlib import Path
from tempfile import NamedTemporaryFile
from zipfile import ZipFile

import pytest
import transaction
import webtest
from PIL import Image

from nextgisweb.env import DBSession
from nextgisweb.lib.geometry import Geometry
from nextgisweb.lib.json import dumpb

from nextgisweb.feature_layer import Feature
from nextgisweb.vector_layer import VectorLayer

from .. import FeatureAttachment

pytestmark = pytest.mark.usefixtures("ngw_resource_defaults", "ngw_auth_administrator")

DATA_PATH = Path(__file__).parent / "data" 

att_ids = dict()


@pytest.fixture(scope='module')
def layer_id():
    att_ids.clear()
    with transaction.manager:
        res = VectorLayer(geometry_type='POINT').persist()

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
                    content = i['content']
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
def test_import(files, result, layer_id, clear, ngw_webtest_app):
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


def test_import_multiple(layer_id, ngw_webtest_app):
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

# name = '{feature_id}/{file_name}'
# TODO: Update whenever the structure of file_meta changes; add images without xmp meta
def test_import_image(layer_id, clear, ngw_webtest_app):
    file_path = DATA_PATH / 'panorama-image.jpg'
    with open(file_path, mode='rb') as f:
        files = [dict(name='00003/image', content=f.read())] # fails to work as a tuple for whatever reason
        upload_meta = generate_archive(files, ngw_webtest_app)
        resp = ngw_webtest_app.put_json(
            f'/api/resource/{layer_id}/feature_attachment/import',
            dict(source=upload_meta),
            status=200,
        )
        assert resp.json == dict(imported=1, skipped=0)

        with transaction.manager:
            file_meta = FeatureAttachment.filter_by(resource_id=layer_id, feature_id=3).one().file_meta
            assert file_meta == {
                "timestamp": "2023-09-18T15:56:09",
                "panorama": {"ProjectionType": "equirectangular"},
            }
