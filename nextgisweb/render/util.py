import struct
from math import log2

import PIL.ImageStat
from affine import Affine

TILE_SIZE = 256


def imgcolor(img):
    """Check image color and return color tuple if all pixels have same color"""
    if img is None:
        return (0, 0, 0, 0)

    # Min and max values for each channel.
    extrema = PIL.ImageStat.Stat(img).extrema

    # If image has transparent alpha channel, other channels won't matter.
    alpha = extrema[3]
    if alpha[0] == 0 and alpha[1] == 0:
        return (0, 0, 0, 0)

    for comp in extrema:
        if comp[0] != comp[1]:
            return None

    return [c[0] for c in extrema]


def af_transform(a, b):
    """Crate affine transform from coordinate system A to B"""
    return ~(
        Affine.translation(a[0], a[3])
        * Affine.scale((a[2] - a[0]) / b[2], (a[1] - a[3]) / b[3])
        * Affine.translation(b[0], b[1])
    )


def affine_from_bounds(a, b):
    # Force arguments to float
    a = [float(i) for i in a]
    b = [float(i) for i in b]

    return ~(
        Affine.translation(a[0], a[1])
        * Affine.scale((a[2] - a[0]) / (b[2] - b[0]), (a[3] - a[1]) / (b[3] - b[1]))
        * Affine.translation(-b[0], -b[1])
    )


def affine_bounds_to_tile(bounds, zoom):
    tilemax = 2**zoom
    return affine_from_bounds(bounds, (0, tilemax, tilemax, 0))


def pack_color(color):
    """Pack color tuple to integer value."""
    return struct.unpack("!i", bytearray(color))[0]


def unpack_color(value):
    """Unpack color integer value to color tuple."""
    return tuple(iter(struct.pack("!i", value)))


def scale_range_intersection(a, b):
    min_a, max_a = a
    min_b, max_b = b

    if min_a is None:
        min_i = min_b
    elif min_b is None:
        min_i = min_a
    else:
        min_i = min(min_a, min_b)

    if max_a is None:
        max_i = max_b
    elif max_b is None:
        max_i = max_a
    else:
        max_i = max(max_a, max_b)

    return (min_i, max_i)


def image_zoom(extent, size, srs):
    if srs.id != 3857:
        return None

    epsilon = 1e-9

    res_x = (extent[2] - extent[0]) / size[0]
    res_y = (extent[3] - extent[1]) / size[1]
    if abs(res_x - res_y) > epsilon:
        return None

    z = log2((srs.maxx - srs.minx) / (TILE_SIZE * res_x))
    rz = round(z)
    if abs(rz - z) > epsilon:
        return None

    return rz
