# -*- coding: utf-8 -*-
from __future__ import unicode_literals

import PIL.ImageStat

from ..i18n import trstring_factory


COMP_ID = 'render'
_ = trstring_factory(COMP_ID)


def imgcolor(img):
    """ Check image color and return color tuple if all pixels have same color """

    # Min and max values for each channel
    extrema = PIL.ImageStat.Stat(img).extrema

    # If image have fully transparent alpha channel other
    # channel other channels doesn't matter at all
    alpha = extrema[3]
    if alpha[0] == 0 and alpha[1] == 0:
        return (0, 0, 0, 0)

    for comp in extrema:
        if comp[0] != comp[1]:
            return None

    return map(lambda c: c[0], extrema)
