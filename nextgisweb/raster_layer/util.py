from osgeo import gdal

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
    size = ds.RasterXSize * ds.RasterYSize * data_type_bytes * (ds.RasterCount + aux_bands)
    return size


def band_color_interp(band) -> str:
    return gdal.GetColorInterpretationName(
        band.GetColorInterpretation(),
    )


def is_rgb(ds):
    if ds.RasterCount not in (3, 4):
        return False

    for bidx in range(1, ds.RasterCount + 1):
        band = ds.GetRasterBand(bidx)
        if band.DataType != gdal.GDT_Byte:
            return False

    return True


def get_predictor(data_type):
    if data_type in (gdal.GDT_Float32, gdal.GDT_Float64):
        return 3

    integer_types = [
        gdal.GDT_Byte,
        gdal.GDT_Int16,
        gdal.GDT_UInt16,
        gdal.GDT_Int32,
        gdal.GDT_UInt32,
    ]

    # Only add 64-bit types if they exist (GDAL >= 3.5)
    if hasattr(gdal, "GDT_Int64"):
        integer_types.append(gdal.GDT_Int64)
    if hasattr(gdal, "GDT_UInt64"):
        integer_types.append(gdal.GDT_UInt64)

    if data_type in integer_types:
        return 2
