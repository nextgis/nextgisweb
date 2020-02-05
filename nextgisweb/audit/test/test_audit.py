from __future__ import division, absolute_import, print_function, unicode_literals

import pytest

from datetime import datetime


def one(es, index):
    result = es.search(index=index, body={"query": {"match_all": {}}}, size=1)
    return result["hits"]["hits"][0]["_source"]


@pytest.fixture(scope="module")
def index():
    timestamp = datetime.now()
    return timestamp.strftime("%Y.%m")


@pytest.fixture(autouse=True, scope="function")
def delete_index(env, index):
    yield
    env.audit.es.indices.delete(index)


@pytest.mark.parametrize("method", ["GET", "POST", "PUT", "DELETE"])
def test_audit_request_method(method, index, env, webapp):
    response = getattr(webapp, method.lower())("/api/resource/0", expect_errors=True)
    env.audit.es.indices.refresh(index=index)
    assert one(env.audit.es, index)["request"]["method"] == method


@pytest.mark.parametrize("path", ["/api/resource/0", "/resource/0"])
def test_audit_request_path(path, index, env, webapp):
    response = webapp.get(path, expect_errors=True)
    env.audit.es.indices.refresh(index=index)
    assert one(env.audit.es, index)["request"]["path"] == path


def test_audit_user(index, env, webapp):
    response = webapp.get("/api/resource/0", expect_errors=True)
    env.audit.es.indices.refresh(index=index)
    assert one(env.audit.es, index)["user"]["id"] == 1
    assert one(env.audit.es, index)["user"]["keyname"] == "guest"
    assert one(env.audit.es, index)["user"]["display_name"] == "Guest"


@pytest.mark.parametrize("path, route_name", [
    ("/api/resource/0", "resource.item"),
    ("/resource/0", "resource.show"),
    ("/admin", None),
])
def test_audit_response_route_name(path, route_name, index, env, webapp):
    response = webapp.get(path, expect_errors=True)
    env.audit.es.indices.refresh(index=index)
    assert one(env.audit.es, index)["response"].get("route_name") == route_name


@pytest.mark.parametrize("path", ["/api/resource/0", "/api/resource/-1"])
def test_audit_response_status_code(path, index, env, webapp):
    response = webapp.get(path, expect_errors=True)
    env.audit.es.indices.refresh(index=index)
    assert one(env.audit.es, index)["response"]["status_code"] == response.status_code
