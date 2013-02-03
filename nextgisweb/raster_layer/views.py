# -*- coding: utf-8 -*-
from shutil import copyfileobj

from osgeo import gdal, gdalconst

from ..object_widget import ObjectWidget

def include(comp):
    Layer = comp.env.layer.Layer
    file_upload = comp.env.file_upload

    class RasterLayerObjectWidget(ObjectWidget):
        
        def is_applicable(self):
            """ На текущий момент загрузка данных поддерживается
            только на этапе создания слоя, а этот виджет только
            загрузку данных и реализует. Поэтому отключим его,
            выполняется что-то отличное от создания объекта. """

            return self.operation == 'create'

        def validate(self):
            result = ObjectWidget.validate(self)
            self.error = []

            supported_gdt = (gdalconst.GDT_Byte, )
            supported_gdt_names = ''.join([gdal.GetDataTypeName(i) for i in supported_gdt])
            
            def error(msg):
                self.error.append(dict(message=msg))

            datafile, metafile = file_upload.get_filename(self.data['file']['id'])

            self._ds = gdal.Open(datafile, gdalconst.GA_ReadOnly)
            if not self._ds:
                error(u"Библиотеке GDAL не удалось открыть загруженный файл.")

            else:
                if self._ds.RasterCount != 3:
                    error(u"Поддерживаются только растры из трех каналов.")

                for b in range(1, self._ds.RasterCount + 1):
                    band = self._ds.GetRasterBand(b)

                    if not band.DataType in supported_gdt:
                        error(u"Канал #%d имеет тип данных %s, однако поддерживаются только каналы типов %s." % (
                            b, gdal.GetDataTypeName(band.DataType),
                            supported_gdt_names
                        ))

                self._proj = self._ds.GetProjection()
                self._gt = self._ds.GetGeoTransform()
                if not self._proj or not self._gt:
                    error(u"Растровые файлы без проекции не поддерживаются.")

            return result and (len(self.error) == 0)


        def populate_obj(self):
            ObjectWidget.populate_obj(self)

            self.obj.srs_id = self.data['srs_id']

            datafile, metafile = file_upload.get_filename(self.data['file']['id'])
            self.obj.load_file(datafile, self.request.env)
        
        def widget_module(self):
            return 'raster_layer/Widget'

    comp.RasterLayer.object_widget = RasterLayerObjectWidget

    comp.RasterLayer.__show_template = 'layer/show.mako'
