# -*- coding: utf-8 -*-
from __future__ import division, unicode_literals, print_function, absolute_import

from shapely.geometry import Point

from nextgisweb.lib.geometry import Geometry


def test_geom():
    wkt = 'POINT(1 0)'

    geom = Geometry.from_wkt(wkt)
    assert geom.wkt == wkt

    shape = Point(1, 0)
    assert geom.shape.equals(shape)

    assert geom.wkb == shape.wkb

    assert geom.to_geojson() == dict(type='Point', coordinates=(1, 0))
