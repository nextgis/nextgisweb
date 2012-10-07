# -*- coding: utf-8 -*-
import tempfile
import shutil
import zipfile
from osgeo import ogr

from wtforms import form, fields, validators

from ..models import DBSession
from ..layer import LayerNewForm

from .models import VectorLayer


def validate_datafile(form, field):
    # проверяем что это zip-архив и файл загружен
    if isinstance(field.data, basestring) or not zipfile.is_zipfile(field.data.file):
        raise validators.ValidationError(u"Необходимо загрузить ZIP-архив!")


class VectorLayerNewForm(LayerNewForm):
    datafile = fields.FileField(
        u"ZIP-архив с shape-файлом:",
        [validate_datafile, ]
    )

    def populate_obj(self, obj):
        super(LayerNewForm, self).populate_obj(obj)

        tmpdir = tempfile.mkdtemp()
        try:
            fa = zipfile.ZipFile(self.datafile.data.file, 'r')
            fa.extractall(path=tmpdir)

            ds = ogr.Open(tmpdir)
            ogrlayer = ds.GetLayer()

            obj.setup_from_ogr(ogrlayer)

            DBSession.add(obj)
            DBSession.flush()

            metadata, table = obj.metadata_and_table()
            metadata.create_all(bind=DBSession.bind)

            obj.load_from_ogr(ogrlayer)

        finally:
            shutil.rmtree(tmpdir)


VectorLayer.__new_form = VectorLayerNewForm
VectorLayer.__show_template = 'vector_layer/show.mako'
