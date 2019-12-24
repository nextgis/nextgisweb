# -*- coding: utf-8 -*-
from __future__ import division, absolute_import, print_function, unicode_literals

import webtest

TEST_FILENAME = 'file.ext'
TEST_CONTENT = bytes('content')


def test_upload_post(env, webapp):
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
