# -*- coding: utf-8 -*-
from __future__ import division, absolute_import, print_function, unicode_literals

import pytest
import webtest

TEST_FILENAME = 'file.ext'
TEST_CONTENT = 'content'.encode('utf-8')

TEST_FILENAME2 = 'file2.ext'
TEST_CONTENT2 = 'content2'.encode('utf-8')


@pytest.fixture(scope='module', autouse=True)
def tus_enable(ngw_env):
    value = ngw_env.file_upload.tus_enabled
    ngw_env.file_upload.tus_enabled = True
    yield
    ngw_env.file_upload.tus_enabled = value


@pytest.fixture()
def tus_disable(ngw_env):
    value = ngw_env.file_upload.tus_enabled
    ngw_env.file_upload.tus_enabled = False
    yield
    ngw_env.file_upload.tus_enabled = value


def test_options(ngw_env, ngw_webtest_app):
    resp = ngw_webtest_app.options('/api/component/file_upload/')
    headers = resp.headers
    assert headers.get('Tus-Resumable') == '1.0.0'
    assert headers.get('Tus-Version') == '1.0.0'
    assert headers.get('Tus-Extension') == 'creation,termination'
    assert headers.get('Tus-Max-Size') == str(ngw_env.file_upload.max_size)


def test_tus_method(ngw_webtest_app):
    create = ngw_webtest_app.post('/api/component/file_upload/', headers={
        str('Tus-Resumable'): str('1.0.0'),
        str('Upload-Length'): str(len(TEST_CONTENT)),
        str('Upload-Metadata'): str('name dGVzdA=='),
    }, status=201)

    assert create.headers.get('Location').startswith('http://localhost/')
    assert create.headers.get('Tus-Resumable') == '1.0.0'

    location = create.headers['Location']
    location = location[len('http://localhost'):]

    # Content type missing
    ngw_webtest_app.patch(location, TEST_CONTENT, headers={
        str('Tus-Resumable'): str('1.0.0'),
        str('Upload-Offset'): str(0)
    }, status=415)

    # Conflict
    ngw_webtest_app.patch(location, TEST_CONTENT[1:], headers={
        str('Tus-Resumable'): str('1.0.0'),
        str('Content-Type'): str('application/offset+octet-stream'),
        str('Upload-Offset'): str(1)
    }, status=409)

    patch = ngw_webtest_app.patch(location, TEST_CONTENT, headers={
        str('Tus-Resumable'): str('1.0.0'),
        str('Content-Type'): str('application/offset+octet-stream'),
        str('Upload-Offset'): str(0)
    }, status=204)

    assert patch.headers.get('Tus-Resumable') == '1.0.0'
    assert patch.headers.get('Upload-Offset') == str(len(TEST_CONTENT))

    head = ngw_webtest_app.head(location, headers={
        str('Tus-Resumable'): str('1.0.0'),
    })

    assert head.status_code == 200
    assert head.headers.get('Upload-Offset') == str(len(TEST_CONTENT))
    assert head.headers.get('Upload-Length') == str(len(TEST_CONTENT))

    get = ngw_webtest_app.get(location, status=200)

    assert get.status_code == 200
    assert get.json['size'] == len(TEST_CONTENT)
    assert get.json['name'] == 'test'

    ngw_webtest_app.delete(location, status=200)
    ngw_webtest_app.delete(location, status=404)


def test_post_single(ngw_env, ngw_webtest_app):
    resp = ngw_webtest_app.post('/api/component/file_upload/', dict(
        file=webtest.Upload(TEST_FILENAME, TEST_CONTENT)))

    datafn, metafn = ngw_env.file_upload.get_filename(resp.json['upload_meta'][0]['id'])
    with open(datafn, 'rb') as fp:
        assert fp.read() == TEST_CONTENT


def test_post_multi(ngw_env, ngw_webtest_app):
    resp = ngw_webtest_app.post('/api/component/file_upload/', [
        ['files[]', webtest.Upload(TEST_FILENAME, TEST_CONTENT)],
        ['files[]', webtest.Upload(TEST_FILENAME2, TEST_CONTENT2)]
    ])

    datafn, metafn = ngw_env.file_upload.get_filename(resp.json['upload_meta'][0]['id'])
    with open(datafn, 'rb') as fp:
        assert fp.read() == TEST_CONTENT

    datafn, metafn = ngw_env.file_upload.get_filename(resp.json['upload_meta'][1]['id'])
    with open(datafn, 'rb') as fp:
        assert fp.read() == TEST_CONTENT2


def test_put(ngw_env, ngw_webtest_app):
    resp = ngw_webtest_app.put('/api/component/file_upload/', TEST_CONTENT)
    datafn, metafn = ngw_env.file_upload.get_filename(resp.json['id'])
    with open(datafn, 'rb') as fp:
        assert fp.read() == TEST_CONTENT
