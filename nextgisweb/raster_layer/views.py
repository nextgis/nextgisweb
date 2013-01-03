# -*- coding: utf-8 -*-
from shutil import copyfileobj

from ..layer import Layer, LayerWidget


def include(comp):

    class RasterLayerWidget(LayerWidget):

        def widget_modules(self):
            return LayerWidget.widget_modules(self) + ('raster_layer/Widget', )

        def populate_obj(self):
            LayerWidget.populate_obj(self)

            self.obj.srs_id = self.data['raster_layer']['srs_id']

            datafile, metafile = self.request.env.file_upload.get_filename(self.data['raster_layer']['file']['id'])
            self.obj.load_file(datafile, self.request.env)

    comp.RasterLayer.widget = RasterLayerWidget
    comp.RasterLayer.__show_template = 'layer/show.mako'
