# -*- coding: utf-8 -*-
from __future__ import division, absolute_import, print_function, unicode_literals
from math import log

from ..i18n import trstring_factory


COMP_ID = 'tmsclient'
_ = trstring_factory(COMP_ID)


def crop_box(src_extent, dst_extent, width, height):
    left = round((dst_extent[0] - src_extent[0]) / (src_extent[2] - src_extent[0]) * width)
    right = round((dst_extent[2] - src_extent[0]) / (src_extent[2] - src_extent[0]) * width)
    upper = round((src_extent[3] - dst_extent[3]) / (src_extent[3] - src_extent[1]) * height)
    bottom = round((src_extent[3] - dst_extent[1]) / (src_extent[3] - src_extent[1]) * height)
    return (left, upper, right, bottom)


def render_zoom(srs, extent, size, tilesize):
    res_x = (extent[2] - extent[0]) / size[0]
    res_y = (extent[3] - extent[1]) / size[1]

    zoom = log(min(
        (srs.maxx - srs.minx) / res_x,
        (srs.maxy - srs.miny) / res_y
    ) / tilesize, 2)

    if zoom % 1 > 0.9:
        zoom += 1

    return int(zoom)


def quad_key(x, y, z):
    quadKey = ''
    for i in range(z):
        digit = 0
        mask = 1 << i
        if (x & mask) != 0:
            digit += 1
        if (y & mask) != 0:
            digit += 2
        quadKey = str(digit) + quadKey
    return quadKey
