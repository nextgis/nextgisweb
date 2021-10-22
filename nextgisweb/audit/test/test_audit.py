import pytest

from datetime import datetime
from nextgisweb.audit.util import es_index


def one(es, index):
    result = es.search(index=index, body={"query": {"match_all": {}}}, size=1)
    return result["hits"]["hits"][0]["_source"]


@pytest.fixture(scope='module', autouse=True)
def skip_without_es(ngw_env):
    if not hasattr(ngw_env.audit, 'es'):
        pytest.skip("Elasticsearch is not available")
    yield


@pytest.fixture(scope="module")
def index(ngw_env):
    return es_index(datetime.now())


@pytest.fixture(autouse=True, scope="function")
def delete_index(ngw_env, index):
    yield
    ngw_env.audit.es.indices.delete(index)


@pytest.mark.parametrize("method", ["GET", "POST", "PUT", "DELETE"])
def test_audit_request_method(method, index, ngw_env, ngw_webtest_app):
    getattr(ngw_webtest_app, method.lower())("/api/resource/0", expect_errors=True)
    ngw_env.audit.es.indices.refresh(index=index)
    assert one(ngw_env.audit.es, index)["request"]["method"] == method


@pytest.mark.parametrize("path", ["/api/resource/0", "/resource/0"])
def test_audit_request_path(path, index, ngw_env, ngw_webtest_app):
    ngw_webtest_app.get(path, expect_errors=True)
    ngw_env.audit.es.indices.refresh(index=index)
    assert one(ngw_env.audit.es, index)["request"]["path"] == path


def test_audit_user(index, ngw_env, ngw_webtest_app):
    ngw_webtest_app.get("/api/resource/0", expect_errors=True)
    ngw_env.audit.es.indices.refresh(index=index)
    assert one(ngw_env.audit.es, index)["user"]["id"] == 1
    assert one(ngw_env.audit.es, index)["user"]["keyname"] == "guest"
    assert one(ngw_env.audit.es, index)["user"]["display_name"] == "Guest"


@pytest.mark.parametrize("path, route_name", [
    ("/api/resource/0", "resource.item"),
    ("/resource/0", "resource.show"),
    ("/admin", None),
])
def test_audit_response_route_name(path, route_name, index, ngw_env, ngw_webtest_app):
    ngw_webtest_app.get(path, expect_errors=True)
    ngw_env.audit.es.indices.refresh(index=index)
    assert one(ngw_env.audit.es, index)["response"].get("route_name") == route_name


@pytest.mark.parametrize("path", ["/api/resource/0", "/api/resource/-1"])
def test_audit_response_status_code(path, index, ngw_env, ngw_webtest_app):
    response = ngw_webtest_app.get(path, expect_errors=True)
    ngw_env.audit.es.indices.refresh(index=index)
    assert one(ngw_env.audit.es, index)["response"]["status_code"] == response.status_code
