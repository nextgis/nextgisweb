# -*- coding: utf-8 -*-
from __future__ import division, unicode_literals, print_function, absolute_import
import sys
import six

from pyramid.response import Response

from ..pyramid.exception import json_error
from ..resource import resource_factory, ServiceScope
from ..core.exception import InsufficientPermissions, UserException
from ..lib.ows import parse_request, get_work_version

from .wfs_handler import WFSHandler
from .model import Service


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


def error_renderer(request, err_info, exc, exc_info, debug=True):
    _json_error = json_error(request, err_info, exc, exc_info, debug=debug)

    xml = WFSHandler.exception_response(
        request, _json_error.get('title'), _json_error.get('message'))

    return Response(
        xml, content_type='application/xml', charset='utf-8',
        status_code=_json_error['status_code'])


def setup_pyramid(comp, config):
    config.add_route(
        'wfsserver.wfs', r'/api/resource/{id:\d+}/wfs',
        factory=resource_factory,
        error_renderer=error_renderer
    ).add_view(wfs, context=Service)
