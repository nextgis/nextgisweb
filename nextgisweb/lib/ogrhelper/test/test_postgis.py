# -*- coding: utf-8 -*-
from __future__ import division, unicode_literals, print_function, absolute_import

import pytest
import six
from osgeo import ogr
from sqlalchemy import func

from nextgisweb.models import DBSession


@pytest.mark.parametrize('wkt', (
    'POINT (1 1)',
    'POINT Z (1 0 -1)'
))
def test_postgis(wkt, ngw_txn):
    g1 = ogr.CreateGeometryFromWkt(wkt)

    wkb = DBSession.query(func.st_asbinary(func.st_geomfromtext(wkt))).scalar()

    g2 = ogr.CreateGeometryFromWkb(wkb.tobytes() if six.PY3 else six.binary_type(wkb))

    assert g1.Equals(g2)
