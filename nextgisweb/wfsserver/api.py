# -*- coding: utf-8 -*-
from __future__ import division, unicode_literals, print_function, absolute_import

from pyramid.response import Response

from ..resource import resource_factory, ServiceScope

from .wfs_handler import WFSHandler
from .model import Service


NS_XLINK = 'http://www.w3.org/1999/xlink'


def wfs(resource, request):
    request.resource_permission(ServiceScope.connect)

    wfsHandler = WFSHandler(resource, request)

    validateSchema = request.GET.get('validateSchema') == '1'
    xml = wfsHandler.response(validateSchema)

    return Response(xml, content_type='text/xml')


def setup_pyramid(comp, config):
    config.add_route(
        'wfsserver.wfs', r'/api/resource/{id:\d+}/wfs',
        factory=resource_factory
    ).add_view(wfs, context=Service)
