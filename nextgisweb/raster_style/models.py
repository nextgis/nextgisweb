# -*- coding: utf-8 -*-
import sqlalchemy as sa
import sqlalchemy.orm as orm
import numpy
from osgeo import gdal_array
import PIL



def include(comp):
    DBSession = comp.env.core.DBSession
    Style = comp.env.style.Style
    
    RasterLayer = comp.env.raster_layer.RasterLayer

    @Style.registry.register
    class RasterStyle(Style):
        __tablename__ = 'raster_style'

        identity = __tablename__
        cls_display_name = u"Растровый стиль"

        style_id = sa.Column(sa.Integer, sa.ForeignKey(Style.id), primary_key=True)

        __mapper_args__ = dict(
            polymorphic_identity=identity,
        )

        widget_module = 'raster_style/Widget'

        @classmethod
        def is_layer_supported(cls, layer):
            return layer.cls == 'raster_layer'

        @classmethod
        def widget_config(cls, layer):
            result = Style.widget_config(layer)
            return result

        def render_image(self, extent, img_size, settings):
            ds = self.layer.gdal_dataset()
            gt = ds.GetGeoTransform()

            result = PIL.Image.new("RGBA", img_size, (0, 0, 0, 0))

            # пересчитываем координаты в пикселы
            off_x = int((extent[0] - gt[0]) / gt[1])
            off_y = int((extent[3] - gt[3]) / gt[5])
            width_x = int(((extent[2] - gt[0]) / gt[1]) - off_x)
            width_y = int(((extent[1] - gt[3]) / gt[5]) - off_y)

            # проверяем, чтобы пикселы не вылезали за пределы изображения
            target_width, target_height = img_size
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
                target_height -= round(float(oversize_bottom) / width_y * target_height)
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
            array = numpy.zeros((target_height, target_width, band_count), numpy.uint8)

            for i in range(band_count):
                array[:, :, i] = gdal_array.BandReadAsArray(ds.GetRasterBand(i + 1), off_x, off_y, width_x, width_y, target_width, target_height)

            wnd = PIL.Image.fromarray(array)
            result.paste(wnd, (offset_left, offset_top))

            return result

    comp.RasterStyle = RasterStyle