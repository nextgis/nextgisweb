# -*- coding: utf-8 -*-
from __future__ import unicode_literals
from ..i18n import trstring_factory
from hashlib import md5

import numpy as np

COMP_ID = 'render'
_ = trstring_factory(COMP_ID)

def imghash(img):
    """ Calculate stable image MD5 hash """
    arr = np.array(img)
    return md5(arr.tobytes())
