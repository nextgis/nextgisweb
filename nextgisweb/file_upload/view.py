# -*- coding: utf-8 -*-
from __future__ import division, absolute_import, print_function, unicode_literals

from ..pyramid import viewargs


@viewargs(renderer='nextgisweb:file_upload/template/test.mako')
def test(request):
    return dict(title="Страница тестирования загрузки файлов")


def setup_pyramid(comp, config):
    config.add_route('file_upload.test', '/file_upload/test').add_view(test)
