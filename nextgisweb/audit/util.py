
import logging
from collections import OrderedDict
from contextlib import contextmanager
from datetime import datetime

import zope.event

from ..env import env
from ..lib.i18n import trstr_factory
from ..lib.json import dumps

COMP_ID = 'audit'
_ = trstr_factory(COMP_ID)


def es_index(timestamp):
    return "%s-%s" % (
        env.audit.audit_es_index_prefix,
        timestamp.strftime(env.audit.audit_es_index_suffix))


def to_nsjdon(data):
    return dumps(data)


class OnResponse(object):

    def __init__(self, request, response, body):
        self._request = request
        self._response = response
        self._body = body

    @property
    def request(self):
        return self._request

    @property
    def response(self):
        return self._response

    @property
    def body(self):
        return self._body


def audit_tween_factory(handler, registry):

    def audit_tween(request):
        comp = request.env.audit

        ignore = False
        for f in comp.request_filters:
            ignore = ignore or not f(request)
            if ignore:
                break

        response = handler(request)

        if not ignore:
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
                    id=user['id'], keyname=user['keyname'],
                    display_name=user['display_name'])

            body['response'] = body_response = OrderedDict(
                status_code=response.status_code)

            if request.matched_route is not None:
                body_response['route_name'] = request.matched_route.name

            context = request.environ.get('audit.context')
            if context is not None:
                body['context'] = OrderedDict(zip(('model', 'id'), context))

            event = OnResponse(request, response, body)
            zope.event.notify(event)

            if comp.audit_es_enabled:
                index = es_index(timestamp)
                comp.es.index(index=index, body=event.body)

            if comp.audit_file_enabled:
                data = to_nsjdon(event.body)
                print(data, file=comp.file)
                comp.file.flush()

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
