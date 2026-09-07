from unittest.mock import ANY, patch

from pyramid.response import Response

from nextgisweb.core.exception import UserException
from nextgisweb.pyramid.test import WebTestApp

from .. import exception


class ErrorTest(UserException):
    title = "Test title"
    message = "Test message"
    detail = "Test detail"
    data = dict()
    http_status_code = 418


class ExceptionTest(Exception):
    pass


def test_error(ngw_webtest_app: WebTestApp, ngw_request_handler):
    def error(request):
        raise ErrorTest

    with ngw_request_handler(error), patch.object(exception, "tests_raise", False):
        resp = ngw_webtest_app.get("/api/test/request", status=418)

    assert resp.json == {
        "title": "Test title",
        "message": "Test message",
        "detail": "Test detail",
        "exception": "nextgisweb.pyramid.test.test_exception.ErrorTest",
        "contact": "support",
        "status_code": 418,
        "request_id": ANY,
        "data": {},
    }


def test_exception(ngw_webtest_app: WebTestApp, ngw_request_handler):
    def handler(request):
        raise ExceptionTest

    with ngw_request_handler(handler), patch.object(exception, "tests_raise", False):
        resp = ngw_webtest_app.get("/api/test/request", status=500)

    assert resp.json == {
        "title": "Internal server error",
        "message": ANY,
        "exception": "nextgisweb.pyramid.exception.InternalServerError",
        "contact": "support",
        "status_code": 500,
        "request_id": ANY,
        "data": {},
    }


def test_json(ngw_webtest_app: WebTestApp, ngw_request_handler):
    def handler(request):
        data = str(type(request.json))
        return Response(data, status_code=200)

    with ngw_request_handler(handler), patch.object(exception, "tests_raise", False):
        ngw_webtest_app.post(
            "/api/test/request",
            headers={"Content-Type": "application/json"},
            data='{"almost": "json" . }',
            status=400,
        )

        ngw_webtest_app.post(
            "/api/test/request",
            headers={"Content-Type": "application/json"},
            data='{"correct": "json"}',
            status=200,
        )


def test_not_found_unauthorized(ngw_webtest_app: WebTestApp):
    ngw_webtest_app.authorization = ("Basic", ("administrator", "invalid"))
    ngw_webtest_app.get("/invalid", status=404)
    ngw_webtest_app.get("/api/invalid", status=404)
