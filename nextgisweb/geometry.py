# -*- coding: utf-8 -*-
from __future__ import unicode_literals, print_function, absolute_import
from inspect import isclass

import shapely.geometry
from shapely.geometry import base
from shapely.ops import transform as map_coords
from shapely import wkt, wkb
from pyproj import Transformer
from sqlalchemy import func

from .models import DBSession

for t in dir(shapely.geometry):
    original = getattr(shapely.geometry, t)
    if isclass(original) and issubclass(original, base.BaseGeometry):

        class SRIDDecorator(original):
            _base_class = original

            def __init__(self, *args, **kwargs):
                self._srid = kwargs.pop('srid') if 'srid' in kwargs else None

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


def geom_transform(g, crs_from, crs_to):
    transformer = Transformer.from_crs(crs_from, crs_to)
    g = map_coords(transformer.transform, g)
    return g


def geom_calc(g, crs, prop, srid):
    # pyproj < 2.3
    def geodesic_calc_with_postgis():
        fun = dict(length=func.ST_Length, area=func.ST_Area)[prop]
        query = fun( func.geography( func.ST_FlipCoordinates(
            func.ST_GeomFromText(geom_to_wkt(g), srid)
        ) ) )
        return DBSession.query(query).scalar()

    factor = crs.axis_info[0].unit_conversion_factor
    calcs = dict(
        length=lambda: geodesic_calc_with_postgis() if crs.is_geographic else g.length * factor,
        area=lambda: geodesic_calc_with_postgis() if crs.is_geographic else g.area * factor**2
    )

    # pyproj >= 2.3
    # calcs = dict(
    #     length=lambda: crs.get_geod().geometry_length(g) if crs.is_geographic else g.length * factor,
    #     area=lambda: crs.get_geod().geometry_area_perimeter(g)[0] if crs.is_geographic else g.area * factor**2
    # )

    if prop not in calcs:
        return None

    return calcs[prop]()
