# -*- coding: utf-8 -*-
from __future__ import division, unicode_literals, print_function, absolute_import
from zope.interface import Attribute

from ..resource import IResourceBase


class IBboxLayer(IResourceBase):
    extent = Attribute(""" Bounding box (extent) of a layer """)
