# -*- coding: utf-8 -*-
from __future__ import division, absolute_import, print_function, unicode_literals
from datetime import datetime

from ..i18n import trstring_factory

COMP_ID = 'audit'
_ = trstring_factory(COMP_ID)


def es_index(timestamp):
    return timestamp.strftime("%Y.%m")


def elasticsearch_tween_factory(handler, registry):
    def elasticsearch_tween(request):
        is_static = request.path_info.startswith("/static/")

        response = handler(request)

        if not is_static and request.env.audit.audit_enabled:
            timestamp = datetime.now()
            index = es_index(timestamp)
            doc = request.env.audit.es.index(
                index=index,
                body={
                    "@timestamp": timestamp,
                    "request": {"method": request.method, "path": request.path},
                    "user": {
                        "id": request.user.id,
                        "keyname": request.user.keyname,
                        "display_name": request.user.display_name,
                    },
                    "response": {
                        "status_code": response.status_code,
                        "route_name": request.matched_route.name
                        if request.matched_route is not None
                        else "",
                    },
                },
            )

        return response

    return elasticsearch_tween
