# -*- coding: utf-8 -*-
import tempfile
import shutil
import zipfile
import ctypes

import osgeo
from osgeo import ogr

from wtforms import form, fields, validators

from ..models import DBSession
from ..layer import Layer
from ..spatial_ref_sys import SRS

from .models import VectorLayer

from ..object_widget import ObjectWidget


class VectorLayerObjectWidget(ObjectWidget):

    def is_applicable(self):
        """ На текущий момент загрузка данных поддерживается
        только на этапе создания слоя, а этот виджет только
        загрузку данных и реализует. Поэтому отключим его,
        выполняется что-то отличное от создания объекта. """

        return self.operation == 'create'

    def populate_obj(self):
        ObjectWidget.populate_obj(self)

        self.obj.srs_id = self.data['srs_id']

        self.obj.setup_from_ogr(self._ogrlayer, self._strdecode)
        self.obj.load_from_ogr(self._ogrlayer, self._strdecode)

    def validate(self):
        result = ObjectWidget.validate(self)
        self.error = []

        datafile, metafile = self.request.env.file_upload.get_filename(self.data['file']['id'])
        self._encoding = self.data['encoding']

        if not zipfile.is_zipfile(datafile):
            self.error.append(dict(message=u"Загруженный файл не является ZIP-архивом."))
            result = False
        else:
            self._unzip_tmpdir = tempfile.mkdtemp()

            zipfile.ZipFile(datafile, 'r').extractall(path=self._unzip_tmpdir)

            with _set_encoding(self._encoding) as strdecode:
                self._strdecode = strdecode
                self._ogrds = ogr.Open(self._unzip_tmpdir)

            if not self._ogrds:
                self.error.append(dict(message=u"Библиотеке GDAL/OGR не удалось открыть файл."))
                result = False

            else:
                if self._ogrds.GetLayerCount() < 1:
                    self.error.append(dict(message=u"Набор данных не содержит слоёв."))
                    result = False

                elif self._ogrds.GetLayerCount() > 1:
                    self.error.append(dict(message=u"Набор данных содержит более одного слоя."))
                    result = False

                else:
                    self._ogrlayer = self._ogrds.GetLayer(0)
                    if not self._ogrlayer:
                        self.error.append(dict(message=u"Не удалось открыть слой."))
                        result = False

        return result

    def __del__(self):
        # Если создавалась временная папка, в которую распаковали ZIP-архив,
        # то ее нужно удалить.
        if hasattr(self, '_unzip_tmpdir'):
            shutil.rmtree(self._unzip_tmpdir)

        ObjectWidget.__del__(self)

    def widget_module(self):
        return 'vector_layer/Widget'


def _set_encoding(encoding):

    class encoding_section(object):

        def __init__(self, encoding):
            self.encoding = encoding

            if self.encoding and osgeo.__version__ >= '1.9':
                # Для GDAL 1.9 и выше пытаемся установить SHAPE_ENCODING
                # через ctypes и libgdal

                # Загружаем библиотеку только в том случае,
                # если нам нужно перекодировать
                self.lib = ctypes.CDLL('libgdal.so')

                # Обертки для функций cpl_conv.h
                # см. http://www.gdal.org/cpl__conv_8h.html

                # CPLGetConfigOption
                self.get_option = self.lib.CPLGetConfigOption
                self.get_option.argtypes = [ctypes.c_char_p, ctypes.c_char_p]
                self.get_option.restype = ctypes.c_char_p

                # CPLStrdup
                self.strdup = self.lib.CPLStrdup
                self.strdup.argtypes = [ctypes.c_char_p, ]
                self.strdup.restype = ctypes.c_char_p

                # CPLSetThreadLocalConfigOption
                # Используем именно thread local вариант функции, чтобы
                # минимизировать побочные эффекты.
                self.set_option = self.lib.CPLSetThreadLocalConfigOption
                self.set_option.argtypes = [ctypes.c_char_p, ctypes.c_char_p]
                self.set_option.restype = None

            elif encoding:
                # Для други версий GDAL вернем функцию обертку, которая
                # умеет декодировать строки в unicode, см. __enter__
                pass

        def __enter__(self):

            if self.encoding and osgeo.__version__ >= '1.9':
                # Для GDAL 1.9 устанавливаем значение SHAPE_ENCODING

                # Оставим копию текущего значения себе
                tmp = self.get_option('SHAPE_ENCODING', None)
                self.old_value = self.strdup(tmp)

                # Установим новое
                self.set_option('SHAPE_ENCODING', self.encoding)

                return lambda (x): x

            elif self.encoding:
                # Функция обертка для других версий GDAL
                return lambda (x): x.decode(self.encoding)

            return lambda (x): x

        def __exit__(self, type, value, traceback):

            if encoding and osgeo.__version__ >= '1.9':
                # Возвращаем на место старое значение
                self.set_option('SHAPE_ENCODING', self.old_value)
                
    return encoding_section(encoding)


VectorLayer.object_widget = VectorLayerObjectWidget

VectorLayer.__show_template = 'vector_layer/show.mako'
