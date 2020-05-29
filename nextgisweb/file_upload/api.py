# -*- coding: utf-8 -*-
from __future__ import division, absolute_import, print_function, unicode_literals
import pickle
import json
import re
from os import unlink
from os.path import isfile
from shutil import copyfileobj
from base64 import b64decode

import magic

import pyramid.httpexceptions as exc
from pyramid.response import Response

from ..env import env
from ..core.exception import UserException
from .util import _


BUF_SIZE = 1024 * 1024


class UploadedFileTooLarge(UserException):
    title = _("Uploaded file too large")
    http_status_code = 413


class UploadNotCompleted(UserException):
    title = _("Upload is not completed")
    http_status_code = 405


def collection(request):
    method = request.method
    comp = request.env.file_upload

    if method == 'OPTIONS':
        headers = {}
        if comp.options['tus.enabled']:
            headers[str('Tus-Version')] = str('1.0.0')
            headers[str('Tus-Extension')] = str('creation,termination')
            headers[str('Tus-Max-Size')] = str(comp.options['max_size'])
        return Response(status=200, headers=headers)

    tus = _tus_resumable_header(request)

    if method == 'POST' and tus:
        return _collection_post_tus(request)

    if method == 'POST' and not tus:
        return _collection_post(request)

    if method == 'PUT' and not tus:
        return _collection_put(request)

    raise exc.HTTPMethodNotAllowed()


def item(request):
    method = request.method
    tus = _tus_resumable_header(request)

    if method == 'HEAD' and tus:
        return _item_head_tus(request)

    if method == 'GET' and not tus:
        return _item_get(request)

    if method == 'PATCH' and tus:
        return _item_patch_tus(request)

    if method == 'DELETE':
        return _item_delete(request, tus)

    raise exc.HTTPMethodNotAllowed()


def _collection_post(request):
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
        size = get_file_size(ufile.file)
        if size > comp.options['max_size']:
            raise UploadedFileTooLarge()

        meta = dict(
            mime_type=ufile.type,
            name=ufile.filename,
            size=size,
        )

        fileid = comp.fileid()
        meta['id'] = fileid

        fn_data, fn_meta = comp.get_filename(fileid, makedirs=True)

        with open(fn_data, 'wb') as fd:
            copyfileobj(ufile.file, fd, length=BUF_SIZE)

        with open(fn_meta, 'wb') as fm:
            fm.write(pickle.dumps(meta))

        metas.append(meta)

    return Response(
        json.dumps(dict(upload_meta=metas)),
        content_type='application/json', charset='utf-8')


def _collection_put(request):
    comp = env.file_upload
    if request.content_length > comp.options['max_size']:
        raise UploadedFileTooLarge()

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
        copyfileobj(request.body_file, fd, length=BUF_SIZE)
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


def _collection_post_tus(request):
    comp = request.env.file_upload

    try:
        upload_length = int(request.headers['Upload-Length'])
    except (KeyError, ValueError):
        return _tus_response(400)
    if upload_length > comp.options['max_size']:
        return _tus_response(413)

    upload_metadata = _tus_decode_upload_metadata(request.headers.get('Upload-Metadata'))

    fid = comp.fileid()
    fnd, fnm = comp.get_filename(fid, makedirs=True)

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

    return _tus_response(201, location=request.route_url('file_upload.item', id=fid))


def _item_head_tus(request):
    comp = request.env.file_upload

    fnd, fnm = comp.get_filename(request.matchdict['id'])

    if not isfile(fnd):
        _tus_response(404)

    with open(fnm, 'r') as fd:
        meta = pickle.loads(fd.read())

    with open(fnd, 'ab') as fd:
        upload_offset = fd.tell()

    return _tus_response(
        200,
        upload_offset=upload_offset,
        upload_length=meta.get('size'),
    )


def _item_get(request):
    fnd, fnm = request.env.file_upload.get_filename(request.matchdict['id'])

    if not isfile(fnm):
        raise exc.HTTPNotFound()

    with open(fnm, 'r') as fd:
        meta = pickle.loads(fd.read())

        # Don't return incomplete upload
        if meta.get('incomplete', False):
            raise UploadNotCompleted()

        return Response(
            json.dumps(meta),
            content_type='application/json')


def _item_patch_tus(request):
    comp = request.env.file_upload

    if request.content_type != 'application/offset+octet-stream':
        return _tus_response(415)

    try:
        upload_offset = int(request.headers['Upload-Offset'])
    except (KeyError, ValueError):
        return _tus_response(400)

    fnd, fnm = comp.get_filename(request.matchdict['id'])

    if not isfile(fnm):
        return _tus_response(404)

    with open(fnm, 'r') as fd:
        meta = pickle.loads(fd.read())
        size = meta['size']

    # Don't upload more than declared file size.
    if upload_offset + request.content_length > size:
        return _tus_response(413)

    # Check minimum chunk size to prevent misconfiguration
    remain = size - upload_offset
    if request.content_length < min(remain, comp.options['tus.chunk_size.minimum']):
        return _tus_response(400)

    with open(fnd, 'ab') as fd:
        # Check for upload conflict
        if upload_offset != fd.tell():
            return _tus_response(409)

        # Copy request body to data file. Input streaming is also supported
        # here is some conditions: uwsgi - does, pserve - doesn't.
        src_fd = request.body_file
        while True:
            buf = src_fd.read(BUF_SIZE)
            if buf is None:
                break
            read = len(buf)
            if len(buf) == 0:
                break
            if upload_offset + read > size:
                return _tus_response(413)
            fd.write(buf)
            upload_offset += read

    if size == upload_offset:
        # File upload completed
        del meta['incomplete']

        # Detect MIME-type
        if 'mime_type' not in meta:
            meta['mime_type'] = magic.from_file(fnd, mime=True)

        # Save changes to metadata
        with open(fnm, 'w') as fd:
            fd.write(pickle.dumps(meta))

    return _tus_response(204, upload_offset=upload_offset)


def _item_delete(request, tus):
    fnd, fnm = request.env.file_upload.get_filename(request.matchdict['id'])
    if not isfile(fnm):
        raise exc.HTTPNotFound()

    unlink(fnd)
    unlink(fnm)

    if tus:
        return _tus_response(204)
    else:
        return Response(
            json.dumps(None),
            content_type='application/json'
        )


def _tus_resumable_header(request):
    tr = request.headers.get('Tus-Resumable')
    if tr is None:
        return False
    elif tr == "1.0.0":
        return True
    else:
        raise exc.exception_response(412)


def _tus_response(status, location=None, upload_offset=None, upload_length=None):
    headers = {str("Tus-Resumable"): str("1.0.0")}

    if upload_offset is not None:
        headers[str('Upload-Offset')] = str(upload_offset)
    if upload_length is not None:
        headers[str('Upload-Length')] = str(upload_length)

    return Response(status=status, location=location, headers=headers)


def _tus_decode_upload_metadata(value):
    result = dict()
    if value is not None:
        kv = value.split(',')
        for kv in value.split(','):
            k, v = kv.strip().split(' ', 2)
            result[k] = b64decode(v)
    return result


def setup_pyramid(comp, config):
    # TODO: Remove legacy routes
    config.add_route(
        'file_upload.upload',
        '/api/component/file_upload/upload'
    ) \
        .add_view(_collection_post, method='POST') \
        .add_view(_collection_put, method='PUT')

    config.add_route(
        'file_upload.collection',
        '/api/component/file_upload/'
    ).add_view(collection)

    config.add_route(
        'file_upload.item',
        '/api/component/file_upload/{id}'
    ).add_view(item)
