# -*- coding: utf-8 -*-
from __future__ import division, absolute_import, print_function, unicode_literals

import webtest

TEST_FILENAME = 'file.ext'
TEST_CONTENT = 'content'.encode('utf-8')

TEST_FILENAME2 = 'file2.ext'
TEST_CONTENT2 = 'content2'.encode('utf-8')


def test_upload_post_single(env, webapp):
    resp = webapp.post('/api/component/file_upload/upload', dict(
        file=webtest.Upload(TEST_FILENAME, TEST_CONTENT)))

    datafn, metafn = env.file_upload.get_filename(resp.json['upload_meta'][0]['id'])
    with open(datafn, 'rb') as fp:
        assert fp.read() == TEST_CONTENT


def test_upload_put(env, webapp):
    resp = webapp.put('/api/component/file_upload/upload', TEST_CONTENT)
    datafn, metafn = env.file_upload.get_filename(resp.json['id'])
    with open(datafn, 'rb') as fp:
        assert fp.read() == TEST_CONTENT


def test_upload_post_multi(env, webapp):
    resp = webapp.post('/api/component/file_upload/upload', [
        ['files[]', webtest.Upload(TEST_FILENAME, TEST_CONTENT)],
        ['files[]', webtest.Upload(TEST_FILENAME2, TEST_CONTENT2)]
    ])

    datafn, metafn = env.file_upload.get_filename(resp.json['upload_meta'][0]['id'])
    with open(datafn, 'rb') as fp:
        assert fp.read() == TEST_CONTENT

    datafn, metafn = env.file_upload.get_filename(resp.json['upload_meta'][1]['id'])
    with open(datafn, 'rb') as fp:
        assert fp.read() == TEST_CONTENT2
