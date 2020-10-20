# -*- coding: utf-8 -*-
from __future__ import division, unicode_literals, print_function, absolute_import
import sys
import six

from pyramid.response import Response

from ..resource import resource_factory, ServiceScope
from ..core.exception import InsufficientPermissions

from .wfs_handler import WFSHandler
from .model import Service


NS_XLINK = 'http://www.w3.org/1999/xlink'


def wfs(resource, request):
    try:
        request.resource_permission(ServiceScope.connect)
    except InsufficientPermissions:
        if request.authenticated_userid is None:
            # Force 401 Unauthorized for unauthenticated users. It's useful for MapInfo
            # because there is no way to give user credentials directly there.

            # TODO: Maybe it should be implemented in the error handler with an additional
            # option to enable this behavior.

            return Response(status_code=401, headers={str('WWW-Authenticate'): str("Basic")})
        else:
            six.reraise(*sys.exc_info())

    fsv = request.env.wfsserver.force_schema_validation
    xml = WFSHandler(
        resource, request,
        force_schema_validation=fsv,
    ).response()
    return Response(xml, content_type='text/xml')


def setup_pyramid(comp, config):
    config.add_route(
        'wfsserver.wfs', r'/api/resource/{id:\d+}/wfs',
        factory=resource_factory
    ).add_view(wfs, context=Service)
