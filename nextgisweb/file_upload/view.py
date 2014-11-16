# -*- coding: utf-8 -*-
from __future__ import unicode_literals

import pickle
import json
import re
from shutil import copyfileobj
from subprocess import check_output

from pyramid.response import Response

from ..env import env
from ..pyramidcomp import viewargs


@viewargs(renderer='nextgisweb:file_upload/template/test.mako')
def test(request):
    return dict(title="Страница тестирования загрузки файлов")


def upload_post(request):
    """ Загрузка файла через стандартный механизм x-www-form-urlencoded """

    comp = env.file_upload

    metas = []

    # Файл загружается как объект класса cgi.FieldStorage у которого есть
    # свойства type(тип файла) и filename(имя файла), cвойства содержащего
    # размер файла - нет, поэтому напишем свою реализацию.

    def get_file_size(file):
        file.seek(0, 2)
        size = file.tell()
        file.seek(0)
        return size

    # Определяем использовался ли режим множественной загрузки

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

    # TODO: Добавить поддержку IFrame для IE и Flash uploader
    return Response("%s" % json.dumps(dict(upload_meta=metas)))


def upload_put(request):
    """ Загрузка файла через HTTP PUT

    TODO: Здесь же в будущем можно будет реализовать возобновляемую загрузку,
    по крайней мере для тех браузеров, что поддерживают FileAPI """

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

    # Если при загрузке не был указан MIME-тип, то определяем его
    # самостоятельно, через вызов утилиты file. Стандартный модуль mimetypes
    # делает это только по расширению, но имя файла может быть неизвестно.

    if not mime:
        mime, _ = check_output(['file', '--mime', '--brief', datafn]) \
            .split('; ')

    meta['mime_type'] = mime

    with open(metafn, 'wb') as fd:
        fd.write(pickle.dumps(meta))

    return Response(json.dumps(meta), status=201,
                    content_type=b'application/json')


def setup_pyramid(comp, config):

    config.add_route('file_upload.test', '/file_upload/test').add_view(test)

    config.add_route(
        'file_upload.upload',
        '/api/component/file_upload/upload', client=()) \
        .add_view(upload_post, method='POST') \
        .add_view(upload_put, method='PUT')

    # TODO: Обратная совместимость, со временем удалить
    config.add_route('#file_upload.upload', '/file_upload/upload') \
        .add_view(upload_post, request_method='POST') \
        .add_view(upload_put, request_method='PUT')
