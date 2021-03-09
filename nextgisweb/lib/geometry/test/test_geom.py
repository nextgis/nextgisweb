# -*- coding: utf-8 -*-
from __future__ import division, unicode_literals, print_function, absolute_import

import pytest

from shapely.geometry import Point

from nextgisweb.lib.geometry import Geometry


@pytest.mark.parametrize('wkt, coords', (
    ('POINT (1 0)', (1, 0)),
    ('POINT Z (1 0 -1)', (1, 0, -1))
))
def test_geom(wkt, coords):
    geom = Geometry.from_wkt(wkt)
    assert geom.wkt == wkt

    shape = Point(*coords)
    assert geom.shape.equals(shape)

    assert geom.wkb == shape.wkb

    assert geom.to_geojson() == dict(type='Point', coordinates=coords)
