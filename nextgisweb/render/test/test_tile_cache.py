# -*- coding: utf-8 -*-
from __future__ import absolute_import, print_function, unicode_literals
from time import sleep
from uuid import uuid4
import logging
import six

import pytest
from PIL import Image, ImageDraw

from nextgisweb.geometry import Point
from nextgisweb.models import DBSession
from nextgisweb.vector_layer import VectorLayer
from nextgisweb.spatial_ref_sys import SRS
from nextgisweb.auth import User

from nextgisweb.render.model import ResourceTileCache
from nextgisweb.render.util import pack_color, unpack_color


@pytest.fixture
def frtc(txn):
    vector_layer = VectorLayer(
        parent_id=0, display_name='from_fields',
        owner_user=User.by_keyname('administrator'),
        geometry_type='POINT',
        srs=SRS.filter_by(id=3857).one(),
        tbl_uuid=six.text_type(uuid4().hex)
    ).persist()
    vector_layer.setup_from_fields([])

    result = ResourceTileCache(
        resource=vector_layer,
    ).persist()

    DBSession.flush()
    result.initialize()
    return result


@pytest.fixture
def img_cross_red():
    result = Image.new('RGBA', (256, 256))
    draw = ImageDraw.Draw(result)
    draw.line((0, 0, 256, 256), fill='red')
    draw.line((0, 256, 256, 0), fill='red')
    return result


@pytest.fixture
def img_cross_green():
    result = Image.new('RGBA', (256, 256))
    draw = ImageDraw.Draw(result)
    draw.line((0, 0, 256, 256), fill='green')
    draw.line((0, 256, 256, 0), fill='green')
    return result


@pytest.fixture
def img_fill():
    result = Image.new('RGBA', (256, 256))
    return result


def test_pack_unpack():
    t = (255, 127, 63, 31)
    assert unpack_color(pack_color(t)) == t


def test_put_get_cross(frtc, img_cross_red, txn):
    tile = (0, 0, 0)
    frtc.put_tile(tile, img_cross_red)
    cimg = frtc.get_tile(tile)
    assert cimg.getextrema() == img_cross_red.getextrema()


def test_put_get_fill(frtc, img_fill, txn):
    tile = (0, 0, 0)
    frtc.put_tile(tile, img_fill)
    cimg = frtc.get_tile(tile)
    assert cimg.getextrema() == img_fill.getextrema()


def test_get_missing(frtc, txn):
    tile = (0, 0, 0)
    assert frtc.get_tile(tile) is None


def test_ttl(frtc, img_cross_red, txn):
    tile = (0, 0, 0)
    frtc.ttl = 1
    frtc.put_tile(tile, img_cross_red)
    sleep(1)
    assert frtc.get_tile(tile) is None


def test_clear(frtc, img_cross_red, txn):
    tile = (0, 0, 0)
    frtc.put_tile(tile, img_cross_red)
    frtc.clear()
    assert frtc.get_tile(tile) is None


def test_invalidate(frtc, img_cross_red, img_cross_green, img_fill, txn, caplog):
    caplog.set_level(logging.DEBUG)
    tile_invalid = (4, 0, 0)
    tile_valid = (4, 15, 15)

    frtc.put_tile(tile_invalid, img_cross_red)
    frtc.put_tile(tile_valid, img_cross_red)

    frtc.invalidate(Point(
        *frtc.resource.srs.tile_center(tile_invalid),
        srid=None))

    assert frtc.get_tile(tile_invalid) is None
    assert frtc.get_tile(tile_valid).getextrema() == img_cross_red.getextrema()

    # Update previously invalidated tile
    frtc.put_tile(tile_invalid, img_cross_green)
    assert frtc.get_tile(tile_invalid).getextrema() == img_cross_green.getextrema()
