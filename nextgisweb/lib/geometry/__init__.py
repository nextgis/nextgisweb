from warnings import warn

from osgeo.ogr import CreateGeometryFromWkb, CreateGeometryFromWkt, wkbNDR
from pyproj import CRS, Transformer as pyTr
from shapely import wkt, wkb
from shapely.geometry import (
    mapping as geometry_mapping,
    shape as geometry_shape,
    box as geometry_box)
from shapely.ops import transform as map_coords


class GeometryNotValid(ValueError):
    pass


class Geometry(object):
    """ Initialization format is kept "as is".
    Other formats are calculated as needed."""

    __slots__ = ('_wkb', '_wkt', '_ogr', '_shape', '_srid')

    def __init__(self, wkb=None, wkt=None, ogr=None, shape=None, srid=None, validate=False):
        if wkb is None and wkt is None and ogr is None and shape is None:
            raise ValueError("None base format is not defined.")

        self._wkb = wkb
        self._wkt = wkt
        self._ogr = ogr
        self._shape = shape

        self._srid = srid

        if validate and (wkb is not None or wkt is not None):
            # Force WKB/WKT validation through conversion to OGR
            ogr = self.ogr

    @property
    def srid(self):
        return self._srid

    # Base constructors

    @classmethod
    def from_wkb(cls, data, srid=None, validate=True):
        return cls(wkb=data, srid=srid, validate=validate)

    @classmethod
    def from_wkt(cls, data, srid=None, validate=True):
        return cls(wkt=data, srid=srid, validate=validate)

    @classmethod
    def from_ogr(cls, data, srid=None, validate=True):
        return cls(ogr=data, srid=srid, validate=validate)

    @classmethod
    def from_shape(cls, data, srid=None, validate=False):
        return cls(shape=data, srid=srid, validate=validate)

    # Additional constructors

    @classmethod
    def from_geojson(cls, data, srid=None, validate=True):
        shape = geometry_shape(data)
        return cls.from_shape(shape, srid=srid, validate=validate)

    @classmethod
    def from_box(cls, minx, miny, maxx, maxy, srid=None):
        return cls.from_shape(
            geometry_box(minx, miny, maxx, maxy),
            srid=srid)

    # Base output formats

    @property
    def wkb(self):
        if self._wkb is None:
            if self._ogr is None and self._shape is not None:
                self._wkb = self._shape.wkb
            else:
                # ORG is the fastest, so convert to OGR and then to WKB.
                self._wkb = self.ogr.ExportToWkb(wkbNDR)
        return self._wkb

    @property
    def wkt(self):
        if self._wkt is None:
            if self._ogr is None and self._shape is not None:
                self._wkt = self._shape.wkt
            else:
                # ORG is the fastest, so convert to OGR and then to WKT.
                self._wkt = self.ogr.ExportToIsoWkt()
        return self._wkt

    @property
    def ogr(self):
        if self._ogr is None:
            if self._wkb is None and self._wkt is not None:
                self._ogr = CreateGeometryFromWkt(self._wkt)
            else:
                # WKB is the fastest, so convert to WKB and then to OGR.
                self._ogr = CreateGeometryFromWkb(self.wkb)

        if self._ogr is None:
            raise GeometryNotValid("Invalid geometry WKB/WKT value!")

        return self._ogr

    @property
    def shape(self):
        if self._shape is None:
            if self._wkb is None and self._wkt is not None:
                self._shape = wkt.loads(self._wkt)
            else:
                # WKB is the fastest, so convert to WKB and then to shape.
                self._shape = wkb.loads(self.wkb)
        return self._shape

    # Additional output formats

    def to_geojson(self):
        # NB: srid is not considered
        return geometry_mapping(self.shape)

    # Editors

    def flip_coordinates(self):
        shape = map_coords(lambda x, y: (y, x), self.shape)
        return Geometry.from_shape(shape, srid=self.srid)

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
            shape = map_coords(self._transformer.transform, geom.shape)
            return Geometry.from_shape(shape)


def crs_unit_factor(crs):
    return crs.axis_info[0].unit_conversion_factor if len(crs.axis_info) > 0 else 1.0


def geom_length(geom, crs_wkt):
    shape = geom.shape
    crs = CRS.from_wkt(crs_wkt)

    if crs.is_geographic:
        return crs.get_geod().geometry_length(shape)
    else:
        return shape.length * crs_unit_factor(crs)


def geom_area(geom, crs_wkt):
    shape = geom.shape
    crs = CRS.from_wkt(crs_wkt)

    if crs.is_geographic:
        return crs.get_geod().geometry_area_perimeter(shape)[0]
    else:
        return shape.area * crs_unit_factor(crs)**2
