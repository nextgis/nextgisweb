# -*- coding: utf-8 -*-
from __future__ import division, absolute_import, print_function, unicode_literals

import pytest
from pyramid.config import Configurator
import zope.interface

from nextgisweb.error import IErrorInfo


class HandledException(Exception):
    zope.interface.implements(IErrorInfo)

    message = "Test message"
    data = dict()
    http_status_code = 418


class UnhandledException(Exception):
    pass


@pytest.fixture(scope='module')
def webapp():
    from webtest import TestApp
    config = Configurator()
    config.add_tween('nextgisweb.pyramid.error_info.tween_factory')

    def handled(request):
        raise HandledException()

    config.add_route('handled', '/handled')
    config.add_view(handled, route_name='handled')

    def unhandled(request):
        raise UnhandledException()

    config.add_route('unhandled', '/unhandled')
    config.add_view(unhandled, route_name='unhandled')

    yield TestApp(config.make_wsgi_app())


def test_handled(webapp):
    resp = webapp.get('/handled', status=418)

    rjson = resp.json
    del rjson['traceback']

    assert rjson == dict(
        message="Test message", data=dict(),
        exception='nextgisweb.pyramid.test.test_error_info.HandledException')


def test_unhandled(webapp):
    with pytest.raises(UnhandledException):
        webapp.get('/unhandled')
