# -*- coding: utf-8 -*-
from __future__ import division, absolute_import, print_function, unicode_literals

import pytest
import webtest

TEST_FILENAME = 'file.ext'
TEST_CONTENT = 'content'.encode('utf-8')

TEST_FILENAME2 = 'file2.ext'
TEST_CONTENT2 = 'content2'.encode('utf-8')


@pytest.fixture()
def tus_enable(env):
    value = env.file_upload.tus_enabled
    env.file_upload.tus_enabled = True
    yield
    env.file_upload.tus_enabled = value


@pytest.fixture()
def tus_disable(env):
    value = env.file_upload.tus_enabled
    env.file_upload.tus_enabled = False
    yield
    env.file_upload.tus_enabled = value


def test_options(env, webapp, tus_enable):
    resp = webapp.options('/api/component/file_upload/')
    headers = resp.headers
    assert headers.get('Tus-Resumable') == '1.0.0'
    assert headers.get('Tus-Version') == '1.0.0'
    assert headers.get('Tus-Extension') == 'creation,termination'
    assert headers.get('Tus-Max-Size') == str(env.file_upload.max_size)


def test_tus_method(env, webapp, tus_enable):
    create = webapp.post('/api/component/file_upload/', headers={
        str('Tus-Resumable'): str('1.0.0'),
        str('Upload-Length'): str(len(TEST_CONTENT)),
        str('Upload-Metadata'): str('name dGVzdA=='),
    }, status=201)

    assert create.headers.get('Location').startswith('http://localhost/')
    assert create.headers.get('Tus-Resumable') == '1.0.0'

    location = create.headers['Location']
    location = location[len('http://localhost'):]

    # Content type missing
    webapp.patch(location, TEST_CONTENT, headers={
        str('Tus-Resumable'): str('1.0.0'),
        str('Upload-Offset'): str(0)
    }, status=415)

    # Conflict
    webapp.patch(location, TEST_CONTENT[1:], headers={
        str('Tus-Resumable'): str('1.0.0'),
        str('Content-Type'): str('application/offset+octet-stream'),
        str('Upload-Offset'): str(1)
    }, status=409)

    patch = webapp.patch(location, TEST_CONTENT, headers={
        str('Tus-Resumable'): str('1.0.0'),
        str('Content-Type'): str('application/offset+octet-stream'),
        str('Upload-Offset'): str(0)
    }, status=204)

    assert patch.headers.get('Tus-Resumable') == '1.0.0'
    assert patch.headers.get('Upload-Offset') == str(len(TEST_CONTENT))

    head = webapp.head(location, headers={
        str('Tus-Resumable'): str('1.0.0'),
    })

    assert head.status_code == 200
    assert head.headers.get('Upload-Offset') == str(len(TEST_CONTENT))
    assert head.headers.get('Upload-Length') == str(len(TEST_CONTENT))

    get = webapp.get(location, status=200)

    assert get.status_code == 200
    assert get.json['size'] == len(TEST_CONTENT)
    assert get.json['name'] == 'test'

    webapp.delete(location, status=200)
    webapp.delete(location, status=404)


def test_post_single(env, webapp):
    resp = webapp.post('/api/component/file_upload/', dict(
        file=webtest.Upload(TEST_FILENAME, TEST_CONTENT)))

    datafn, metafn = env.file_upload.get_filename(resp.json['upload_meta'][0]['id'])
    with open(datafn, 'rb') as fp:
        assert fp.read() == TEST_CONTENT


def test_post_multi(env, webapp):
    resp = webapp.post('/api/component/file_upload/', [
        ['files[]', webtest.Upload(TEST_FILENAME, TEST_CONTENT)],
        ['files[]', webtest.Upload(TEST_FILENAME2, TEST_CONTENT2)]
    ])

    datafn, metafn = env.file_upload.get_filename(resp.json['upload_meta'][0]['id'])
    with open(datafn, 'rb') as fp:
        assert fp.read() == TEST_CONTENT

    datafn, metafn = env.file_upload.get_filename(resp.json['upload_meta'][1]['id'])
    with open(datafn, 'rb') as fp:
        assert fp.read() == TEST_CONTENT2


def test_put(env, webapp):
    resp = webapp.put('/api/component/file_upload/', TEST_CONTENT)
    datafn, metafn = env.file_upload.get_filename(resp.json['id'])
    with open(datafn, 'rb') as fp:
        assert fp.read() == TEST_CONTENT
