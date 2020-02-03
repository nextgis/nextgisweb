# -*- coding: utf-8 -*-
from __future__ import division, absolute_import, print_function, unicode_literals
from datetime import datetime
from collections import OrderedDict

from ..i18n import trstring_factory

COMP_ID = 'audit'
_ = trstring_factory(COMP_ID)


def es_index(timestamp):
    return timestamp.strftime("%Y.%m")


def elasticsearch_tween_factory(handler, registry):
    def elasticsearch_tween(request):
        ignore = request.path_info.startswith(("/static/", "/_debug_toolbar/"))

        response = handler(request)

        if not ignore and request.env.audit.audit_enabled:
            timestamp = datetime.now()
            index = es_index(timestamp)

            body = OrderedDict((
                ("@timestamp", timestamp),
                ("request", OrderedDict(method=request.method, path=request.path)),
            ))

            user = request.environ.get("auth.user")
            if user is not None:
                body['user'] = OrderedDict(
                    id=user.id, keyname=user.keyname,
                    display_name=user.display_name)

            body['response'] = body_response = OrderedDict(
                status_code=response.status_code)

            if request.matched_route is not None:
                body_response['route_name'] = request.matched_route.name

            request.env.audit.es.index(index=index, body=body)

        return response

    return elasticsearch_tween
