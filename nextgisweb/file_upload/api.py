# -*- coding: utf-8 -*-
from __future__ import division, absolute_import, print_function, unicode_literals

import pickle
import json
import re
import magic

from shutil import copyfileobj

from pyramid.response import Response

from ..env import env


def upload_post(request):
    """ Upload through standard x-www-form-urlencoded """

    comp = env.file_upload

    metas = []

    # File is uploaded as object of class cgi.FieldStorage which has
    # properties type(file type) and filename(file name), there is no file size property
    # so let's add our own implementation.

    def get_file_size(file):
        file.seek(0, 2)
        size = file.tell()
        file.seek(0)
        return size

    # Determine if multi-threaded upload was used

    ufiles = request.POST.getall('files[]') \
        if 'files[]' in request.POST \
        else [request.POST['file']]

    for ufile in ufiles:
        meta = dict(
            mime_type=ufile.type,
            name=ufile.filename,
            size=get_file_size(ufile.file)
        )

        fileid = comp.fileid()
        meta['id'] = fileid

        fn_data, fn_meta = comp.get_filename(fileid, makedirs=True)

        with open(fn_data, 'wb') as fd:
            copyfileobj(ufile.file, fd)

        with open(fn_meta, 'wb') as fm:
            fm.write(pickle.dumps(meta))

        metas.append(meta)

    # TODO: Add IFrame support for IE and Flash uploader
    return Response(
        json.dumps(dict(upload_meta=metas)),
        content_type='application/json', charset='utf-8')


def upload_put(request):
    """ Upload file through HTTP PUT

    TODO: Here we can add break-and-continue upload at least
    for browsers that support FileAPI """

    comp = env.file_upload

    mime = request.headers.get("Content-Type")
    if mime == 'application/x-www-form-urlencoded':
        mime = None

    fileid = comp.fileid()
    meta = dict(id=fileid)

    cntdisp = request.headers.get("Content-Disposition")
    if cntdisp:
        match = re.match(r'^.*filename="{0,1}(.*?)"{0,1}$', cntdisp)
        if match:
            meta['name'] = match.group(1)

    datafn, metafn = comp.get_filename(fileid, makedirs=True)

    with open(datafn, 'wb') as fd:
        copyfileobj(request.body_file, fd)
        meta['size'] = fd.tell()

    # If MIME-type was not declared on upload, define independently
    # by running file. Standard mimetypes package does it only using extension
    # but we don't always know filename.

    if not mime:
        mime = magic.from_file(datafn, mime=True)

    meta['mime_type'] = mime

    with open(metafn, 'wb') as fd:
        fd.write(pickle.dumps(meta))

    return Response(
        json.dumps(meta), status=201,
        content_type='application/json', charset='utf-8')


def setup_pyramid(comp, config):
    config.add_route(
        'file_upload.upload',
        '/api/component/file_upload/upload'
    ) \
        .add_view(upload_post, method='POST') \
        .add_view(upload_put, method='PUT')
