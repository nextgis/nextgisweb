# -*- coding: utf-8 -*-
from __future__ import division, unicode_literals, print_function, absolute_import

from warnings import warn

from pyproj import CRS, Transformer as pyTr
from shapely import wkt, wkb
from shapely.geometry import mapping, shape
from shapely.ops import transform as map_coords


class Geometry(object):

    def __init__(self, wkb=None, wkt=None, shape_obj=None, srid=None):
        self._wkb = wkb
        self._wkt = wkt
        self._shape = shape_obj

        if not any((self._wkb, self._wkt, self._shape)):
            raise ValueError("None base format is not defined.")

        self._srid = srid

    @property
    def srid(self):
        return self._srid

    # Base constructors

    @staticmethod
    def from_wkb(data, srid=None):
        return Geometry(wkb=data, srid=srid)

    @staticmethod
    def from_wkt(data, srid=None):
        return Geometry(wkt=data, srid=srid)

    @staticmethod
    def from_shape(data, srid=None):
        return Geometry(shape_obj=data, srid=srid)

    # Additional constructors

    @staticmethod
    def from_geojson(data, srid=None):
        shape_obj = shape(data)
        return Geometry.from_shape(shape_obj, srid=srid)

    # Base output formats

    @property
    def wkb(self):
        if self._wkb is None:
            self._wkb = self.shape.wkb
        return self._wkb

    @property
    def wkt(self):
        if self._wkt is None:
            self._wkt = self.shape.wkt
        return self._wkt

    @property
    def shape(self):
        if self._shape is None:
            if self._wkb is not None:
                self._shape = wkb.loads(self._wkb)
            else:
                self._shape = wkt.loads(self._wkt)
        return self._shape

    # Additional output formats

    def to_geojson(self):
        return mapping(self.shape)

    # Shapely providers

    @property
    def bounds(self):
        return self.shape.bounds

    def simplify(self, *args, **kwargs):
        warn("Geometry.simplify is deprecated! Use Geometry.shape object instead.",
             DeprecationWarning)
        return self.shape.simplify(*args, **kwargs)


class Transformer(object):

    def __init__(self, wkt_from, wkt_to):
        crs_from = CRS.from_wkt(wkt_from)
        crs_to = CRS.from_wkt(wkt_to)

        # pyproj >= 2.5
        # if crs_from.equals(crs_to):
        if wkt_from == wkt_to:
            self._transformer = None
        else:
            self._transformer = pyTr.from_crs(crs_from, crs_to, always_xy=True)

    def transform(self, geom):
        # NB: geom.srid is not considered
        if self._transformer is None:
            return geom
        else:
            shape_obj = map_coords(self._transformer.transform, geom.shape)
            return Geometry.from_shape(shape_obj)
