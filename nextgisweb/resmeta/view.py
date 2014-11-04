# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from ..resource import Widget, Resource


class Widget(Widget):
    resource = Resource
    operation = ('create', 'update')
    amdmod = 'ngw-resmeta/Widget'
