import logging
from time import sleep

import pytest
import transaction
from PIL import Image, ImageDraw
from shapely.geometry import Point

from nextgisweb.env import DBSession
from nextgisweb.lib.geometry import Geometry

from nextgisweb.raster_layer import RasterLayer
from nextgisweb.raster_style import RasterStyle

from ..model import ResourceTileCache, TilestorWriter
from ..util import pack_color, unpack_color

pytestmark = pytest.mark.usefixtures("ngw_resource_defaults")


@pytest.fixture
def frtc():
    with transaction.manager:
        layer = RasterLayer(
            xsize=100,
            ysize=100,
            dtype="Byte",
            band_count=3,
        ).persist()

        style = RasterStyle(parent=layer).persist()

        result = ResourceTileCache(
            resource=style,
        ).persist()
        result.async_writing = True

        DBSession.flush()
        result.initialize()

    yield result


@pytest.fixture
def img_cross_red():
    result = Image.new("RGBA", (256, 256))
    draw = ImageDraw.Draw(result)
    draw.line((0, 0, 256, 256), fill="red")
    draw.line((0, 256, 256, 0), fill="red")
    return result


@pytest.fixture
def img_cross_green():
    result = Image.new("RGBA", (256, 256))
    draw = ImageDraw.Draw(result)
    draw.line((0, 0, 256, 256), fill="green")
    draw.line((0, 256, 256, 0), fill="green")
    return result


@pytest.fixture
def img_fill():
    result = Image.new("RGBA", (256, 256), (100, 100, 100, 100))
    return result


@pytest.fixture
def img_empty():
    result = Image.new("RGBA", (256, 256), (0, 0, 0, 0))
    return result


@pytest.fixture(scope="session", autouse=True)
def wait_for_shutdown():
    yield
    TilestorWriter.getInstance().wait_for_shutdown()


def test_pack_unpack():
    t = (255, 127, 63, 31)
    assert unpack_color(pack_color(t)) == t


def test_put_get_cross(frtc, img_cross_red):
    tile = (0, 0, 0)
    frtc.put_tile(tile, img_cross_red)
    exists, cimg = frtc.get_tile(tile)
    assert exists and cimg.getextrema() == img_cross_red.getextrema()


def test_put_get_fill(frtc, img_fill):
    tile = (0, 0, 0)
    frtc.put_tile(tile, img_fill)
    exists, cimg = frtc.get_tile(tile)
    assert exists and cimg.getextrema() == img_fill.getextrema()


def test_put_get_empty(frtc, img_empty):
    tile = (0, 0, 0)
    frtc.put_tile(tile, img_empty)
    exists, cimg = frtc.get_tile(tile)
    assert exists and cimg is None


def test_get_missing(frtc):
    tile = (0, 0, 0)
    exists, cimg = frtc.get_tile(tile)
    assert not exists


def test_ttl(frtc, img_cross_red):
    tile = (0, 0, 0)
    frtc.ttl = 1
    frtc.put_tile(tile, img_cross_red)
    sleep(1)
    exists, cimg = frtc.get_tile(tile)
    assert not exists


def test_clear(frtc, img_cross_red):
    tile = (0, 0, 0)
    frtc.put_tile(tile, img_cross_red)
    frtc.clear()
    exists, cimg = frtc.get_tile(tile)
    assert not exists


def test_invalidate(frtc, img_cross_red, img_cross_green, img_fill, caplog):
    caplog.set_level(logging.DEBUG)
    tile_invalid = (4, 0, 0)
    tile_valid = (4, 15, 15)

    frtc.put_tile(tile_invalid, img_cross_red)
    frtc.put_tile(tile_valid, img_cross_red)

    frtc.invalidate(
        Geometry.from_shape(
            Point(*frtc.resource.srs.tile_center(tile_invalid)),
            srid=None,
        )
    )

    exists, cimg = frtc.get_tile(tile_invalid)
    assert not exists

    exists, cimg = frtc.get_tile(tile_valid)
    assert exists and cimg.getextrema() == img_cross_red.getextrema()

    # Update previously invalidated tile
    frtc.put_tile(tile_invalid, img_cross_green)
    exists, cimg = frtc.get_tile(tile_invalid)
    assert exists and cimg.getextrema() == img_cross_green.getextrema()
