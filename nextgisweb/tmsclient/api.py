# -*- coding: utf-8 -*-
from __future__ import division, absolute_import, print_function, unicode_literals

from ..resource import ConnectionScope, resource_factory

from .model import Connection, NEXTGIS_GEOSERVICES


def inspect_connection(request):
    request.resource_permission(ConnectionScope.connect)

    connection = request.context

    result = []

    if connection.capmode == NEXTGIS_GEOSERVICES:
        pass

    return result


def setup_pyramid(comp, config):
    config.add_route(
        'tmsclient.connection.layers', '/api/component/tmsclient/{id}/layers/',
        factory=resource_factory
    ).add_view(inspect_connection, context=Connection, request_method='GET', renderer='json')
