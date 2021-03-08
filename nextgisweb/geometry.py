# -*- coding: utf-8 -*-
from __future__ import division, unicode_literals, print_function, absolute_import
import warnings

from .lib.geometry import Geometry, Transformer

warnings.warn(
    "The 'nextgisweb.geometry' module deprecated now and it's going to be "
    "removed in 3.8.0. Use the 'nextgisweb.lib.geometry' module instead.",
    DeprecationWarning, stacklevel=2)


def box(minx, miny, maxx, maxy, ccw=True, srid=None):
    return Geometry.from_box(minx, miny, maxx, maxy, srid=srid)


def geom_from_geojson(data, srid=None):
    return Geometry.from_geojson(data, srid=srid)


def geom_to_geojson(geom):
    return geom.to_geojson()


def geom_from_wkt(data, srid=None):
    return Geometry.from_wkt(data, srid=srid)


def geom_to_wkt(geom):
    return geom.wkt


def geom_from_wkb(data, srid=None):
    return Geometry.from_wkb(data, srid=srid)
