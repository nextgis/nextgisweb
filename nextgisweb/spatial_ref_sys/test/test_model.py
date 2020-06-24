# -*- coding: utf-8 -*-
from __future__ import division, absolute_import, print_function, unicode_literals

import pytest

from nextgisweb import db
from nextgisweb.models import DBSession
from nextgisweb.core.exception import ValidationError
from nextgisweb.spatial_ref_sys.models import (
    SRS, SRID_LOCAL,
    WKT_EPSG_4326, WKT_EPSG_3857,
    BOUNDS_EPSG_3857, BOUNDS_EPSG_4326)

WKT_EPSG_3395 = 'PROJCS["WGS 84 / World Mercator",GEOGCS["WGS 84",DATUM["WGS_1984",SPHEROID["WGS 84",6378137,298.257223563,AUTHORITY["EPSG","7030"]],AUTHORITY["EPSG","6326"]],PRIMEM["Greenwich",0,AUTHORITY["EPSG","8901"]],UNIT["degree",0.0174532925199433,AUTHORITY["EPSG","9122"]],AUTHORITY["EPSG","4326"]],PROJECTION["Mercator_1SP"],PARAMETER["central_meridian",0],PARAMETER["scale_factor",1],PARAMETER["false_easting",0],PARAMETER["false_northing",0],UNIT["metre",1,AUTHORITY["EPSG","9001"]],AXIS["Easting",EAST],AXIS["Northing",NORTH],AUTHORITY["EPSG","3395"]]'  # NOQA


def test_postgis_sync(txn):
    obj = SRS(wkt=WKT_EPSG_4326, display_name='')
    obj.persist()
    DBSession.flush()

    assert obj.id >= SRID_LOCAL

    qpg = db.text('SELECT srtext FROM spatial_ref_sys WHERE srid = :id')

    srtext, = DBSession.connection().execute(qpg, id=obj.id).fetchone()
    assert obj.wkt == srtext

    obj.wkt = WKT_EPSG_3857
    DBSession.flush()

    srtext, = DBSession.connection().execute(qpg, id=obj.id).fetchone()
    assert obj.wkt == srtext

    DBSession.delete(obj)
    DBSession.flush()

    assert DBSession.connection().execute(qpg, id=obj.id).fetchone() is None


@pytest.mark.parametrize('x, y, src, dst', (
    (0, 0, 4326, 3857),
    (20037508.34, 20037508.34, 3857, 4326),
))
def test_postgis_transform(txn, x, y, src, dst):
    px, py = DBSession.connection().execute(db.text(
        'SELECT ST_X(pt), ST_Y(pt) '
        'FROM ST_Transform(ST_Transform('
        '   ST_SetSRID(ST_MakePoint(:x, :y), :src) ,:dst), :src) AS pt'
    ), x=x, y=y, src=src, dst=dst).fetchone()
    assert abs(px - x) < 1e-6
    assert abs(py - y) < 1e-6


def test_wkt_valid():
    SRS(wkt=WKT_EPSG_4326)


def test_wkt_invalid():
    with pytest.raises(ValidationError):
        SRS(wkt='INVALID')


@pytest.mark.parametrize('srs_id, tile, expected', (
    # West and east hemispheres
    (4326, (0, 0, 0), (-180, -90, 0, 90)),
    (4326, (0, 1, 0), (0, -90, 180, 90)),
    # Check that Y-axis is top to bottom
    (4326, (1, 0, 0), (-180, 0, -90, 90)),
    (4326, (1, 3, 1), (90, -90, 180, 0)),
    # Root tile in EPSG:3857
    (3857, (0, 0, 0), BOUNDS_EPSG_3857),
    # Example from mercantile docs rounded to 2 decimal places
    (3857, (10, 486, 332), (-1017529.72, 7005300.77, -978393.96, 7044436.53)),
))
def test_tile_extent(txn, srs_id, tile, expected):
    srs = SRS.filter_by(id=srs_id).one()
    extent = tuple([round(c, 2) for c in srs.tile_extent(tile)])
    assert extent == expected


@pytest.mark.parametrize('srs_id, extent, z, expected', (
    (4326, BOUNDS_EPSG_4326, 0, [0, 0, 1, 0]),
    (3857, BOUNDS_EPSG_3857, 0, [0, 0, 0, 0]),
    (4326, (0, 0, 180, 0), 0, [1, 0, 1, 0]),
    (4326, (-180, -90, 0, 90), 0, [0, 0, 0, 0]),
    (3857, (-1017529.72, 7005300.77, -978393.96, 7044436.53), 10, [486, 332, 486, 332]),
))
def test_extent_tile_range(txn, srs_id, extent, z, expected):
    srs = SRS.filter_by(id=srs_id).one()
    tile_range = srs.extent_tile_range(map(float, extent), z)
    assert tile_range == expected


def test_point_tilexy(txn):
    zoom = 12
    vdk_x, vdk_y = 14681475, 5329463
    srs_3857 = SRS.filter_by(id=3857).one()
    assert map(int, srs_3857._point_tilexy(vdk_x, vdk_y, zoom)) == [3548, 1503]

    srs_3395 = SRS(
        wkt=WKT_EPSG_3395,
        minx=-20037508.342789244,
        miny=-20037508.342789244,
        maxx=20037508.342789244,
        maxy=20037508.342789244,
    )

    vdk_x, vdk_y = 14681475, 5300249
    assert map(int, srs_3395._point_tilexy(vdk_x, vdk_y, zoom)) == [3548, 1506]
