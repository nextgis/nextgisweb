# -*- coding: utf-8 -*-
from __future__ import division, absolute_import, print_function, unicode_literals

from ..resource import Widget

from .model import WFSConnection, WFSLayer


class WFSConnectionWidget(Widget):
    resource = WFSConnection
    operation = ('create', 'update')
    amdmod = 'ngw-wfsclient/WFSConnectionWidget'


class WFSLayerWidget(Widget):
    resource = WFSLayer
    operation = ('create', 'update')
    amdmod = 'ngw-wfsclient/WFSLayerWidget'
