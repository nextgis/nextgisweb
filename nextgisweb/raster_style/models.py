# -*- coding: utf-8 -*-
from __future__ import unicode_literals, print_function, absolute_import
import numpy
from osgeo import gdal_array
import PIL
from zope.interface import implements

from ..models import declarative_base
from ..resource import Resource, DataScope
from ..render import (
    IRenderableStyle,
    IExtentRenderRequest,
    ITileRenderRequest)

from .util import _

Base = declarative_base()


class RenderRequest(object):
    implements(IExtentRenderRequest, ITileRenderRequest)

    def __init__(self, style, srs, cond):
        self.style = style
        self.srs = srs
        self.cond = cond

    def render_extent(self, extent, size):
        return self.style.render_image(extent, size)

    def render_tile(self, tile, size):
        extent = self.srs.tile_extent(tile)
        return self.style.render_image(extent, (size, size))


class RasterStyle(Base, Resource):
    identity = 'raster_style'
    cls_display_name = _("Raster style")

    __scope__ = DataScope

    implements(IRenderableStyle)

    @classmethod
    def check_parent(cls, parent):
        return parent.cls == 'raster_layer'

    @property
    def srs(self):
        return self.parent.srs

    def render_request(self, srs, cond=None):
        return RenderRequest(self, srs, cond)

    def render_image(self, extent, size):
        ds = self.parent.gdal_dataset()
        gt = ds.GetGeoTransform()

        result = PIL.Image.new("RGBA", size, (0, 0, 0, 0))

        # пересчитываем координаты в пикселы
        off_x = int((extent[0] - gt[0]) / gt[1])
        off_y = int((extent[3] - gt[3]) / gt[5])
        width_x = int(((extent[2] - gt[0]) / gt[1]) - off_x)
        width_y = int(((extent[1] - gt[3]) / gt[5]) - off_y)

        # проверяем, чтобы пикселы не вылезали за пределы изображения
        target_width, target_height = size
        offset_left = offset_top = 0

        # правая граница
        if off_x + width_x > ds.RasterXSize:
            oversize_right = off_x + width_x - ds.RasterXSize
            target_width -= int(float(oversize_right) / width_x * target_width)
            width_x -= oversize_right

        # левая граница
        if off_x < 0:
            oversize_left = -off_x
            offset_left = int(float(oversize_left) / width_x * target_width)
            target_width -= int(float(oversize_left) / width_x * target_width)
            width_x -= oversize_left
            off_x = 0

        # нижняя граница
        if off_y + width_y > ds.RasterYSize:
            oversize_bottom = off_y + width_y - ds.RasterYSize
            target_height -= round(float(oversize_bottom)
                                   / width_y * target_height)
            width_y -= oversize_bottom

        # верхняя граница
        if off_y < 0:
            oversize_top = -off_y
            offset_top = int(float(oversize_top) / width_y * target_height)
            target_height -= int(float(oversize_top) / width_y * target_height)
            width_y -= oversize_top
            off_y = 0

        if target_width <= 0 or target_height <= 0:
            # экстент не пересекается с экстентом изображения
            # возвращаем пустую картинку
            return result

        band_count = ds.RasterCount
        array = numpy.zeros((target_height, target_width, band_count),
                            numpy.uint8)

        for i in range(band_count):
            array[:, :, i] = gdal_array.BandReadAsArray(
                ds.GetRasterBand(i + 1),
                off_x, off_y,
                width_x, width_y,
                target_width, target_height
            )

        wnd = PIL.Image.fromarray(array)
        result.paste(wnd, (offset_left, offset_top))

        return result
