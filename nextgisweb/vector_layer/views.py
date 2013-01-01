# -*- coding: utf-8 -*-
import tempfile
import shutil
import zipfile
from osgeo import ogr

from wtforms import form, fields, validators

from ..models import DBSession
from ..layer import Layer, LayerWidget

from .models import VectorLayer


class VectorLayerWiget(LayerWidget):

    def widget_modules(self):
        return LayerWidget.widget_modules(self) + ('vector_layer/Widget', )

    def populate_obj(self):
        LayerWidget.populate_obj(self)

        datafile, metafile = self.request.env.file_upload.get_filename(self.data['vector_layer']['file']['id'])

        tmpdir = tempfile.mkdtemp()
        try:
            fa = zipfile.ZipFile(datafile, 'r')
            fa.extractall(path=tmpdir)

            ds = ogr.Open(tmpdir)
            ogrlayer = ds.GetLayer()

            self.obj.setup_from_ogr(ogrlayer)

            DBSession.flush()

            metadata, table = self.obj.metadata_and_table()
            metadata.create_all(bind=DBSession.bind)

            self.obj.load_from_ogr(ogrlayer)

        finally:
            shutil.rmtree(tmpdir)


VectorLayer.widget = VectorLayerWiget


def validate_datafile(form, field):
    # проверяем что это zip-архив и файл загружен
    if isinstance(field.data, basestring) or not zipfile.is_zipfile(field.data.file):
        raise validators.ValidationError(u"Необходимо загрузить ZIP-архив!")

VectorLayer.__show_template = 'vector_layer/show.mako'
