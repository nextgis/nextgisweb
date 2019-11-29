# -*- coding: utf-8 -*-
from __future__ import unicode_literals, print_function, absolute_import
from inspect import isclass

import shapely.geometry
from shapely.geometry import base
from shapely import wkt, wkb
from osgeo import ogr, osr

for t in dir(shapely.geometry):
    original = getattr(shapely.geometry, t)
    if isclass(original) and issubclass(original, base.BaseGeometry):

        class SRIDDecorator(original):
            _base_class = original

            def __init__(self, *args, **kwargs):
                self._srid = kwargs.pop('srid')

                self._base_class.__init__(self, *args, **kwargs)

            @property
            def srid(self):
                return self._srid

        SRIDDecorator.__name__ = t
        globals()[t] = SRIDDecorator


def box(minx, miny, maxx, maxy, ccw=True, srid=None):
    g = shapely.geometry.box(minx, miny, maxx, maxy)
    g.__class__ = globals()[g.__class__.__name__]
    g._srid = srid
    return g


def geom_from_wkt(data, srid=None):
    g = wkt.loads(data)
    g.__class__ = globals()[g.__class__.__name__]
    g._srid = srid
    return g


def geom_to_wkt(g):
    return wkt.dumps(g)


def geom_from_wkb(data, srid=None):
    g = wkb.loads(data)
    g.__class__ = globals()[g.__class__.__name__]
    g._srid = srid
    return g


def geom_wkt_transform(data, srs_from, srs_to):
    geom = ogr.CreateGeometryFromWkt(data)
    source = osr.SpatialReference()
    target = osr.SpatialReference()
    source.ImportFromProj4(srs_from.proj4.encode("utf-8"))
    target.ImportFromProj4(srs_to.proj4.encode("utf-8"))
    transformation = osr.CoordinateTransformation(source, target)
    geom.Transform(transformation)
    return geom.ExportToWkt()
