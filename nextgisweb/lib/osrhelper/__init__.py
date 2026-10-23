from osgeo import gdal, osr

__all__ = [
    "SpatialReferenceError",
    "sr_from_epsg",
    "sr_from_wkt",
    "traditional_axis_mapping",
]


def traditional_axis_mapping(sr: osr.SpatialReference) -> osr.SpatialReference:
    sr.SetAxisMappingStrategy(osr.OAMS_TRADITIONAL_GIS_ORDER)
    return sr


class SpatialReferenceError(ValueError):
    pass


def _handle(result_code: int) -> None:
    if result_code != 0:
        raise SpatialReferenceError(gdal.GetLastErrorMsg())


def sr_from_epsg(code: int) -> osr.SpatialReference:
    sr = traditional_axis_mapping(osr.SpatialReference())
    _handle(sr.ImportFromEPSG(code))
    return sr


def sr_from_wkt(wkt: str) -> osr.SpatialReference:
    sr = traditional_axis_mapping(osr.SpatialReference())
    _handle(sr.ImportFromWkt(wkt))
    return sr
