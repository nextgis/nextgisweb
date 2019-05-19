# -*- coding: utf-8 -*-
from __future__ import unicode_literals
from ..i18n import trstring_factory
from hashlib import md5

import PIL.ImageStat
import numpy as np

COMP_ID = 'render'
_ = trstring_factory(COMP_ID)

def imghash(img):
    """ Calculate stable image MD5 hash """
    arr = np.array(img)
    return md5(arr.tobytes())


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
