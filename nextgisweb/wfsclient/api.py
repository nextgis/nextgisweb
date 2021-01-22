# -*- coding: utf-8 -*-
from __future__ import division, absolute_import, print_function, unicode_literals

import json

from pyramid.response import Response

from ..resource import ConnectionScope

from .model import WFSConnection


def inspect_connection(resource, request):
    request.resource_permission(ConnectionScope.connect)

    capabilities = resource.get_capabilities()

    return Response(json.dumps(capabilities['layers']), content_type='application/json')


def inspect_layer(resource, request):
    request.resource_permission(ConnectionScope.connect)

    layer_name = request.matchdict['table_name']
    fields = resource.get_fields(layer_name)

    return Response(json.dumps(fields), content_type='application/json')


def setup_pyramid(comp, config):
    config.add_view(
        inspect_connection, route_name='resource.inspect',
        context=WFSConnection, request_method='GET')

    config.add_view(
        inspect_layer, route_name='resource.inspect.table',
        context=WFSConnection, request_method='GET')
