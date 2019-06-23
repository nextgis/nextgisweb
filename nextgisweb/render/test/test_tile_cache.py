# -*- coding: utf-8 -*-
from __future__ import absolute_import, print_function, unicode_literals
from time import sleep

import pytest
from PIL import Image, ImageDraw

from nextgisweb.models import DBSession
from nextgisweb.resource import Resource
from nextgisweb.auth import User

from nextgisweb.render.model import ResourceTileCache


@pytest.fixture
def frtc(txn):
    result = ResourceTileCache(
        resource=Resource(
            parent_id=0, display_name='',
            owner_user=User.by_keyname('administrator'))
    ).persist()
    DBSession.flush()
    result.initialize()
    return result


@pytest.fixture
def img_cross():
    result = Image.new('RGBA', (256, 256))
    draw = ImageDraw.Draw(result)
    draw.line((0, 0, 256, 256), fill='red')
    draw.line((0, 256, 256, 0), fill='red')
    return result


@pytest.fixture
def img_fill():
    result = Image.new('RGBA', (256, 256))
    return result


def test_put_get_cross(frtc, img_cross, txn):
    tile = (0, 0, 0)
    frtc.put_tile(tile, img_cross)
    cimg = frtc.get_tile(tile)
    assert cimg.getextrema() == img_cross.getextrema()


def test_put_get_fill(frtc, img_fill, txn):
    tile = (0, 0, 0)
    frtc.put_tile(tile, img_fill)
    cimg = frtc.get_tile(tile)
    assert cimg.getextrema() == img_fill.getextrema()


def test_get_missing(frtc, txn):
    tile = (0, 0, 0)
    assert frtc.get_tile(tile) is None


def test_clear(frtc, img_cross, txn):
    tile = (0, 0, 0)
    frtc.put_tile(tile, img_cross)
    frtc.clear()
    assert frtc.get_tile(tile) is None


def test_ttl(frtc, img_cross, txn):
    tile = (0, 0, 0)
    frtc.ttl = 1
    frtc.put_tile(tile, img_cross)
    sleep(1)
    assert frtc.get_tile(tile) is None
