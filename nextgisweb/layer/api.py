# -*- coding: utf-8 -*-
from __future__ import unicode_literals
import json

from pyramid.response import Response

from ..resource import DataScope, resource_factory
from .interface import IBboxLayer


def extent(resource, request):
    request.resource_permission(DataScope.read)

    extent = resource.extent

    return Response(
        json.dumps(dict(extent=extent)),
        content_type=b'application/json')


def setup_pyramid(comp, config):
    config.add_route(
        'layer.extent', '/api/resource/{id}/extent',
        factory=resource_factory) \
        .add_view(extent, context=IBboxLayer, request_method='GET')
