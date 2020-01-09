# -*- coding: utf-8 -*-
from __future__ import division, absolute_import, print_function, unicode_literals

import pytest

from nextgisweb import db
from nextgisweb.models import DBSession
from nextgisweb.core.exception import ValidationError
from nextgisweb.spatial_ref_sys.models import SRS, SRID_LOCAL, WKT_ESPG_4326, WKT_ESPG_3857


def test_postgis_sync(txn):
    obj = SRS(wkt=WKT_ESPG_4326, display_name='')
    obj.persist()
    DBSession.flush()

    assert obj.id >= SRID_LOCAL

    qpg = db.text('SELECT srtext FROM spatial_ref_sys WHERE srid = :id')

    srtext, = DBSession.connection().execute(qpg, id=obj.id).fetchone()
    assert obj.wkt == srtext

    obj.wkt = WKT_ESPG_3857
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
    SRS(wkt=WKT_ESPG_4326)


def test_wkt_invalid():
    with pytest.raises(ValidationError):
        SRS(wkt='INVALID')
