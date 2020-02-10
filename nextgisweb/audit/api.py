# -*- coding: utf-8 -*-
from __future__ import division, absolute_import, print_function, unicode_literals

from pyramid.response import Response


def export(request):
    request.require_administrator()

    date_from = request.params.get("date_from")
    date_to = request.params.get("date_to")
    user = request.params.get("user")

    return Response()


def setup_pyramid(comp, config):
    if comp.audit_enabled:
        config.add_route(
            'audit.export', '/api/component/audit/export') \
            .add_view(export, request_method='GET')
