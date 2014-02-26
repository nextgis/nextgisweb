# -*- coding: utf-8 -*-

from ..resource import Widget

from .model import Connection, Layer


class ClientWidget(Widget):
    resource = Connection
    operation = ('create', 'update')
    amdmod = 'ngw-wmsclient/ConnectionWidget'


class LayerWidget(Widget):
    resource = Layer
    operation = ('create', 'update')
    amdmod = 'ngw-wmsclient/LayerWidget'
