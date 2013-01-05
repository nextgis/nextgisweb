# -*- coding: utf-8 -*-

from ..object_widget import ObjectWidget


def setup_pyramid(comp, config):

    class RasterStyleObjectWidget(ObjectWidget):

        def widget_module(self):
            return 'raster_style/Widget'

    comp.RasterStyle.object_widget = RasterStyleObjectWidget
