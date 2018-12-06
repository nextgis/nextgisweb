# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from ..resource import Widget, Resource
from .model import Connection, Layer
from .util import _


class ClientWidget(Widget):
    resource = Connection
    operation = ('create', 'update')
    amdmod = 'ngw-wmsclient/ConnectionWidget'


class LayerWidget(Widget):
    resource = Layer
    operation = ('create', 'update')
    amdmod = 'ngw-wmsclient/LayerWidget'


class LayerVendorParamsWidget(Widget):
    resource = Layer
    operation = ('create', 'update')
    amdmod = 'ngw-wmsclient/LayerVendorParamsWidget'


def setup_pyramid(comp, conf):
    Resource.__psection__.register(
        key='wmsclient_connection', priority=50,
        title=_("WMS capabilities"),
        is_applicable=lambda obj: (
            obj.cls == 'wmsclient_connection'
            and obj.capcache()),
        template='nextgisweb:wmsclient/template/section_connection.mako')

    Resource.__psection__.register(
        key='wmsclient_layer_vendor_param', priority=50,
        title=_("WMS vendor parameters"),
        is_applicable=lambda obj: (
            obj.cls == 'wmsclient_layer'
            and len(obj.vendor_params) > 0),
        template='nextgisweb:wmsclient/template/section_vendor_params.mako')
