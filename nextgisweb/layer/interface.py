# -*- coding: utf-8 -*-
from zope.interface import Attribute

from ..resource import IResourceBase


class IBboxLayer(IResourceBase):
    extent = Attribute(""" Ограничивающий прямоугольник (охват) слоя """)
