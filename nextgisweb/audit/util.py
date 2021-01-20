# -*- coding: utf-8 -*-
from __future__ import division, absolute_import, print_function, unicode_literals

import logging
from collections import OrderedDict
from contextlib import contextmanager
from datetime import datetime

from .. import geojson
from ..env import env
from ..i18n import trstring_factory

COMP_ID = 'audit'
_ = trstring_factory(COMP_ID)


def es_index(timestamp):
    return "%s-%s" % (
        env.audit.audit_es_index_prefix,
        timestamp.strftime(env.audit.audit_es_index_suffix))


def to_nsjdon(data):
    return geojson.dumps(data) + '\n'


def audit_tween_factory(handler, registry):

    def audit_tween(request):
        ignore = request.path_info.startswith(("/static/", "/_debug_toolbar/"))

        response = handler(request)

        if not ignore and request.env.audit.audit_enabled:
            timestamp = datetime.utcnow()

            body = OrderedDict((
                ("@timestamp", timestamp),
                ("request", OrderedDict(
                    method=request.method,
                    path=request.path,
                    remote_addr=request.remote_addr)),
            ))

            qstring = request.query_string
            if qstring != "":
                body["request"]["query_string"] = qstring

            user = request.environ.get("auth.user")
            if user is not None:
                body['user'] = OrderedDict(
                    id=user.id, keyname=user.keyname,
                    display_name=user.display_name)

            body['response'] = body_response = OrderedDict(
                status_code=response.status_code)

            if request.matched_route is not None:
                body_response['route_name'] = request.matched_route.name

            context = request.environ.get('audit.context')
            if context is not None:
                body['context'] = OrderedDict(zip(('model', 'id'), context))

            if request.env.audit.audit_es_enabled:
                index = es_index(timestamp)
                request.env.audit.es.index(index=index, body=body)
            if request.env.audit.audit_file_enabled:
                with open(request.env.audit.options['file'], 'a') as f:
                    data = to_nsjdon(body)
                    print(data, file=f)

        return response

    return audit_tween


def audit_context(request, model, id):
    request.environ['audit.context'] = (model, id)


@contextmanager
def disable_logging(highest_level=logging.CRITICAL):
    """ Context manager to temporary prevent log messages """
    previous_level = logging.root.manager.disable
    logging.disable(highest_level)
    try:
        yield
    finally:
        logging.disable(previous_level)
