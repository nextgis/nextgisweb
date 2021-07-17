
# -*- coding: utf-8 -*-
from __future__ import division, absolute_import, print_function, unicode_literals

from ..core import KindOfData

from .util import _


class VectorLayerData(KindOfData):
    identity = 'vector_layer'
    display_name = _("Vector layer features")
