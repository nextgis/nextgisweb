# -*- coding: utf-8 -*-
from __future__ import unicode_literals, print_function, absolute_import
from inspect import isclass

import shapely.geometry
from shapely.geometry import base
from shapely import wkt, wkb

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


def geom_from_wkb(data, srid=None):
    g = wkb.loads(data)
    g.__class__ = globals()[g.__class__.__name__]
    g._srid = srid
    return g
