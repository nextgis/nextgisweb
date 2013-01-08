# -*- coding: utf-8 -*-
import tempfile
import shutil
import zipfile
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

        self.obj.setup_from_ogr(self._ogrlayer)
        self.obj.load_from_ogr(self._ogrlayer)

    def validate(self):
        result = ObjectWidget.validate(self)
        self.error = []

        datafile, metafile = self.request.env.file_upload.get_filename(self.data['file']['id'])

        if not zipfile.is_zipfile(datafile):
            self.error.append(dict(message=u"Загруженный файл не является ZIP-архивом."))
            result = False
        else:
            self._unzip_tmpdir = tempfile.mkdtemp()

            zipfile.ZipFile(datafile, 'r').extractall(path=self._unzip_tmpdir)

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

VectorLayer.object_widget = VectorLayerObjectWidget

VectorLayer.__show_template = 'vector_layer/show.mako'
