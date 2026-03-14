import numpy
from osgeo import gdal, gdal_array
from PIL import Image


def heif_init():
    if not getattr(heif_init, "_done", False):
        from pillow_heif import register_heif_opener

        register_heif_opener()
        setattr(heif_init, "_done", True)


def reproject_render(render_fn, extent, size, dst_wkt, src_wkt):
    xmin, ymin, xmax, ymax = extent
    width, height = size

    mem = gdal.GetDriverByName("MEM")

    dst_geo = (xmin, (xmax - xmin) / width, 0, ymax, 0, (ymin - ymax) / height)
    dst_ds = mem.Create("", width, height, 4, gdal.GDT_Byte)
    dst_ds.SetGeoTransform(dst_geo)

    vrt = gdal.AutoCreateWarpedVRT(dst_ds, dst_wkt, src_wkt)
    src_width = vrt.RasterXSize
    src_height = vrt.RasterYSize
    src_geo = vrt.GetGeoTransform()
    vrt = None

    src_extent = (
        src_geo[0],
        src_geo[3] + src_geo[5] * src_height,
        src_geo[0] + src_geo[1] * src_width,
        src_geo[3],
    )
    img = render_fn(src_extent, (src_width, src_height))

    if img is not None:
        data = numpy.asarray(img)
        _, _, band_count = data.shape

        src_ds = mem.Create("", src_width, src_height, band_count, gdal.GDT_Byte)
        src_ds.SetGeoTransform(src_geo)
        for i in range(band_count):
            src_ds.GetRasterBand(i + 1).WriteArray(data[:, :, i])

        gdal.ReprojectImage(src_ds, dst_ds, src_wkt, dst_wkt)

        array = numpy.zeros((height, width, band_count), numpy.uint8)
        for i in range(band_count):
            array[:, :, i] = gdal_array.BandReadAsArray(dst_ds.GetRasterBand(i + 1))
        img = Image.fromarray(array)

        src_ds = dst_ds = None

    return img
