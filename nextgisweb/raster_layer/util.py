from osgeo import gdal

from ..lib.i18n import trstr_factory

COMP_ID = 'raster_layer'
_ = trstr_factory(COMP_ID)

PYRAMID_TARGET_SIZE = 512


def calc_overviews_levels(ds, blocksize=PYRAMID_TARGET_SIZE):
    cursize = max(ds.RasterXSize, ds.RasterYSize)
    multiplier = 2
    levels = []

    while cursize > blocksize or len(levels) == 0:
        levels.append(multiplier)
        cursize /= 2
        multiplier *= 2

    return levels


def raster_size(ds, aux_bands=0, data_type=None):
    if data_type is None:
        # Multiple types not supported, so get first band type
        data_type = ds.GetRasterBand(1).DataType
    data_type_bytes = gdal.GetDataTypeSize(data_type) // 8
    size = ds.RasterXSize * ds.RasterYSize * data_type_bytes * (
        ds.RasterCount + aux_bands)
    return size
