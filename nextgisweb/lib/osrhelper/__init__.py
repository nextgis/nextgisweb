# -*- coding: utf-8 -*-
from __future__ import division, unicode_literals, print_function, absolute_import

from osgeo import gdal, osr


def traditional_axis_mapping(sr):
    if gdal.VersionInfo() >= '3000000':
        sr.SetAxisMappingStrategy(osr.OAMS_TRADITIONAL_GIS_ORDER)
    return sr
