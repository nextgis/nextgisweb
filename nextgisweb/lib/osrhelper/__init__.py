from osgeo import gdal, osr


def traditional_axis_mapping(sr):
    sr.SetAxisMappingStrategy(osr.OAMS_TRADITIONAL_GIS_ORDER)
    return sr


class SpatialReferenceError(ValueError):
    pass


def _handle(result_code):
    if result_code != 0:
        raise SpatialReferenceError(gdal.GetLastErrorMsg())


def sr_from_epsg(code):
    sr = traditional_axis_mapping(osr.SpatialReference())
    _handle(sr.ImportFromEPSG(code))
    return sr


def sr_from_wkt(wkt):
    sr = traditional_axis_mapping(osr.SpatialReference())
    _handle(sr.ImportFromWkt(wkt))
    return sr
