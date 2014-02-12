# -*- coding: utf-8 -*-
import pickle
import json
from shutil import copyfileobj

from pyramid.response import Response


def includeme(config, comp, env):

    def test(request):
        return dict(custom_layout=False)

    config.add_route('file_upload.test', '/file_upload/test')\
        .add_view(test, renderer='file_upload/test.mako')

    def upload(request):
        
        metas = []

        # Файл загружается как объект класса cgi.FieldStorage у
        # которого есть свойства type(тип файла) и filename(имя файла),
        # cвойства, содержащего размер файла - нет, поэтому напишем свою реализацию.
        def get_file_size(file):
            file.seek(0, 2)
            size = file.tell()
            file.seek(0)
            return size
        
        # Определяем использовался ли режим множественной загрузки
        ufiles = request.POST.getall('files[]') if 'files[]' in request.POST else [request.POST['file']]
        
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

        # TODO: Добавить поддержку IFrame для IE и Flash uploader
        return Response(
            "%s" % json.dumps(dict(upload_meta=metas))
        )

    config.add_route('file_upload.upload', '/file_upload/upload', client=()) \
        .add_view(upload)
