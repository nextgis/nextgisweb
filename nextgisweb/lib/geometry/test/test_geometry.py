# -*- coding: utf-8 -*-
from __future__ import division, unicode_literals, print_function, absolute_import
import six

import pytest
from osgeo import ogr, gdal
from shapely.geometry import Point
from shapely.wkt import loads as wkt_loads
from shapely.wkb import loads as wkb_loads
from sqlalchemy import func as sa_func

from nextgisweb.models import DBSession

from nextgisweb.lib.geometry import Geometry


@pytest.mark.parametrize('wkt', (
    pytest.param('POINT (1 2)', id='point-2d'),
    pytest.param('POINT Z (1 2 3)', id='point-3d'),
    pytest.param('GEOMETRYCOLLECTION EMPTY', id='empty-col'),
    # NOTE: M and ZM geometries don't work here because of lack
    # of support in the Shapely library.
))
def test_wkt_wkb(wkt, ngw_txn):
    ogr_geom = ogr.CreateGeometryFromWkt(six.ensure_str(wkt))
    assert ogr_geom is not None, gdal.GetLastErrorMsg()
    wkt_iso = ogr_geom.ExportToIsoWkt()

    shp_geom = wkt_loads(wkt)
    wkb_shp = shp_geom.wkb
    assert shp_geom.wkt == wkt_iso, "Shapely WKT didn't return ISO WKT"

    wkb_iso = _pg_wkt_to_wkb_iso(wkt)
    wkb_ext = _pg_wkt_to_wkb_ext(wkt)

    assert wkb_shp == wkb_ext, "PostGIS EWKT and Shapely WKB didn't match"
    assert wkb_loads(wkb_iso).wkt == wkt_iso, "Shapely didn't understand ISO WKB"
    assert wkb_loads(wkb_ext).wkt == wkt_iso, "Shapely didn't understand EWKB"

    assert _pg_wkb(wkb_iso) == wkb_ext, "PostGIS didn't understand ISO WKB"
    assert _pg_wkb(wkb_ext) == wkb_ext, "PostGIS didn't understand EWKB"

    assert Geometry.from_wkb(wkb_iso).wkt == wkt_iso, "ISO WKB parsing has failed"
    assert Geometry.from_wkb(wkb_ext).wkt == wkt_iso, "EWKB parsing has failed"
    assert Geometry.from_wkt(wkt_iso).wkb == wkb_ext, "WKT parsing has failed"


def _pg_wkt_to_wkb_iso(wkt):
    return _query_scalar_bytes(sa_func.st_asbinary(
        sa_func.st_geomfromtext(wkt), 'NDR'))


def _pg_wkt_to_wkb_ext(wkt):
    return _query_scalar_bytes(sa_func.st_asewkb(
        sa_func.st_geomfromtext(wkt), 'NDR'))


def _pg_wkb(wkb):
    _wkb = wkb.hex() if six.PY3 else wkb.encode('hex')
    return _query_scalar_bytes(sa_func.st_asewkb(
        sa_func.st_geomfromwkb(sa_func.decode(_wkb, 'hex')), 'NDR'))


def _query_scalar_bytes(query):
    v = DBSession.query(query).scalar()
    if six.PY3:
        return v.tobytes()
    else:
        return six.binary_type(v)