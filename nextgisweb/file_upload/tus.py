# -*- coding: utf-8 -*-
from __future__ import division, absolute_import, print_function, unicode_literals
import pickle
import json
from os.path import getsize, isfile
from shutil import copyfileobj
from base64 import b64decode

import magic
from pyramid.response import Response
from pyramid.httpexceptions import HTTPNotFound

BUF_SIZE = 1024 * 1024


def collection_post(request):
    fid = request.env.file_upload.fileid()
    fnd, fnm = request.env.file_upload.get_filename(fid, makedirs=True)

    upload_length = int(request.headers['Upload-Length'])
    upload_metadata = _decode_upload_metadata(request.headers.get('Upload-Metadata'))

    # Just touch the data file
    with open(fnd, 'wb') as fd:
        pass

    meta = dict(id=fid, size=upload_length, incomplete=True)

    # Copy name and mime_type from upload metadata
    for k in ('name', 'mime_type'):
        v = upload_metadata.get(k)
        if v is not None:
            meta[k] = v

    with open(fnm, 'w') as fd:
        fd.write(pickle.dumps(meta))

    return _resp(201, location=request.route_url('file_upload.item', id=fid))


def item_head(request):
    fnd, fnm = request.env.file_upload.get_filename(request.matchdict['id'])
    return _resp(200, upload_offset=getsize(fnd))


def item_patch(request):
    fnd, fnm = request.env.file_upload.get_filename(request.matchdict['id'])

    if not isfile(fnm):
        return _resp(404)

    upload_offset = int(request.headers["Upload-Offset"])

    with open(fnm, 'r') as fd:
        meta = pickle.loads(fd.read())

    if upload_offset + request.content_length > meta['size']:
        # Don't upload more than declared file size
        return _resp(413)

    with open(fnd, 'ab') as fd:
        # Check for upload conflict
        if upload_offset != fd.tell():
            return _resp(409)

        # Copy request body to file and store new offset
        copyfileobj(request.body_file, fd, length=BUF_SIZE)
        upload_offset = upload_offset + request.content_length

    if meta['size'] == upload_offset:
        # File upload completed
        del meta['incomplete']

        # Detect MIME-type
        if 'mime_type' not in meta:
            meta['mime_type'] = magic.from_file(fnd, mime=True)

        # Save changes to metadata
        with open(fnm, 'w') as fd:
            fd.write(pickle.dumps(meta))

    return _resp(204, upload_offset=upload_offset)


def item_get(request):
    fnd, fnm = request.env.file_upload.get_filename(request.matchdict['id'])
    if not isfile(fnm):
        raise HTTPNotFound()
    with open(fnm, 'r') as fd:
        return Response(
            json.dumps(pickle.loads(fd.read())),
            content_type='application/json')


def _resp(status, location=None, upload_offset=None):
    headers = {
        str("Tus-Resumable"): str("1.0.0")
    }

    if upload_offset is not None:
        headers[str('Upload-Offset')] = str(upload_offset)

    return Response(status=status, location=location, headers=headers)


def _decode_upload_metadata(value):
    if value is None:
        return dict()

    result = dict()
    kv = value.split(',')
    for kv in value.split(','):
        kv = kv.strip()
        k, v = kv.split(' ', 2)
        v = b64decode(v)
        result[k] = v

    return result


def setup_pyramid(comp, config):
    r_collection = config.add_route('file_upload.collection', '/api/component/file_upload/')
    r_item = config.add_route('file_upload.item', '/api/component/file_upload/{id}')

    r_collection.add_view(collection_post, request_method='POST')

    r_item.add_view(item_head, request_method='HEAD')
    r_item.add_view(item_patch, request_method='PATCH')
    r_item.add_view(item_get, request_method='GET')
