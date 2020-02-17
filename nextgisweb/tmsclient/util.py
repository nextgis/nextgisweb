# -*- coding: utf-8 -*-
from __future__ import division, absolute_import, print_function, unicode_literals

from ..i18n import trstring_factory


COMP_ID = 'tmsclient'
_ = trstring_factory(COMP_ID)


def crop_box(src_extent, dst_extent, width, height):
    left   = round((dst_extent[0] - src_extent[0]) / (src_extent[2] - src_extent[0]) * width)
    right  = round((dst_extent[2] - src_extent[0]) / (src_extent[2] - src_extent[0]) * width)
    upper  = round((src_extent[3] - dst_extent[3]) / (src_extent[3] - src_extent[1]) * height)
    bottom = round((src_extent[3] - dst_extent[1]) / (src_extent[3] - src_extent[1]) * height)
    return (left, upper, right, bottom)
