# -*- coding: utf-8 -*-
import pickle
import json
from shutil import copyfileobj

from pyramid.view import view_config
from pyramid.response import Response


def includeme(config, comp, env):

    def test(request):
        return dict(custom_layout=False)

    config.add_route('file_upload.test', '/file_upload/test')
    config.add_view(test, route_name='file_upload.test', renderer='file_upload/test.mako')

    def upload(request):
        ufile = request.POST['file']

        meta = dict(
            mime_type=str(request.POST['type']),
            size=int(request.POST['size']),
            name=str(request.POST['name'])
        )

        fileid = comp.fileid()
        meta['id'] = fileid

        fn_data, fn_meta = comp.get_filename(fileid, makedirs=True)

        with open(fn_data, 'wb') as fd:
            copyfileobj(ufile.file, fd)

        with open(fn_meta, 'wb') as fm:
            fm.write(pickle.dumps(meta))

        # TODO: Добавить поддержку IFrame для IE и Flash uploader
        return Response(
            "%s" % json.dumps(meta)
        )

    config.add_route('file_upload.upload', '/file_upload/upload')
    config.add_view(upload, route_name='file_upload.upload')