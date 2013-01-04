# -*- coding: utf-8 -*-
from shutil import copyfileobj

from ..layer import Layer
from ..object_widget import ObjectWidget

def include(comp):

    class RasterLayerObjectWidget(ObjectWidget):

        def populate_obj(self):
            ObjectWidget.populate_obj(self)

            self.obj.srs_id = self.data['srs_id']

            datafile, metafile = self.request.env.file_upload.get_filename(self.data['file']['id'])
            self.obj.load_file(datafile, self.request.env)
        
        def widget_module(self):
            return 'raster_layer/Widget'

    comp.RasterLayer.object_widget = RasterLayerObjectWidget

    comp.RasterLayer.__show_template = 'layer/show.mako'
