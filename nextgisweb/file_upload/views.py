# -*- coding: utf-8 -*-
import uuid
import os
import os.path
import pickle
from shutil import copyfileobj
import json

from pyramid.view import view_config
from pyramid.response import Response


@view_config(route_name='file_upload.test', renderer='file_upload/test.mako')
def file_upload_test(request):
    return dict(custom_layout=False)


@view_config(route_name='file_upload.upload')
def file_upload_upload(request):
    print request.POST
    ufile = request.POST['file']

    meta = dict(
        mime_type=str(request.POST['type']),
        size=int(request.POST['size']),
        name=str(request.POST['name'])
    )

    path = request.registry.settings['file_upload.path']

    file_uuid = str(uuid.uuid4())
    meta['id'] = file_uuid

    levels = (file_uuid[0:2], file_uuid[2:4])
    levels_path = os.path.join(path, *levels)
    if not os.path.isdir(levels_path):
        os.makedirs(levels_path)

    file_path = os.path.join(levels_path, file_uuid)

    with open(file_path + '.data', 'wb') as fd:
        copyfileobj(ufile.file, fd)

    with open(file_path + '.meta', 'wb') as fm:
        fm.write(pickle.dumps(meta))

    # TODO: Добавить поддержку IFrame для IE и Flash uploader
    return Response(
        "%s" % json.dumps(meta)
    )
