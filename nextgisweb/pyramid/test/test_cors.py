from contextlib import contextmanager
from itertools import product

import pytest

pytestmark = pytest.mark.usefixtures("ngw_auth_administrator")

origins_match = ["http://example.com", "http://sub.example.com"]
origins_no_match = ["http://other.example.com", "http://other.tld"]
origins = [*product(origins_match, [True]), *product(origins_no_match, [False])]


@pytest.fixture()
def override(ngw_core_settings_override):
    @contextmanager
    def wrapped(value=None):
        with ngw_core_settings_override(
            [("pyramid", "cors_allow_origin", value)],
        ):
            yield

    return wrapped


@pytest.mark.parametrize(
    "origin, ok",
    (
        ("http://domain.com", True),
        ("https://domain.com/", True),
        ("https://*", False),
        ("https://*.com", False),
        ("https://*.domain.com", True),
        ("https://*.sub.domain.com", True),
        ("https://*.sub.domain.com.", True),
        ("https://*.*.domain.com", False),
    ),
)
def test_validation(origin, ok, ngw_webtest_app, override):
    url = "/api/component/pyramid/csettings"
    body = dict(pyramid=dict(allow_origin=[origin]))
    ngw_webtest_app.put_json(url, body, status=200 if ok else 422)


@pytest.mark.parametrize("origin, match", origins)
@pytest.mark.parametrize("not_found", [False, True])
def test_headers(origin, match, not_found, ngw_webtest_app, override):
    with override(origins_match):
        url = "/api/resource/%d" % (2**31 if not_found else 0)
        resp = ngw_webtest_app.get(url, headers={"Origin": origin}, status="*")

        h = lambda s: resp.headers.get(f"Access-Control-Allow-{s}")
        assert h("Credentials") == ("true" if match else None)
        assert h("Origin") == (origin if match else None)


@pytest.mark.parametrize("origin, match", origins)
@pytest.mark.parametrize("not_found", [False, True])
def test_options(origin, match, not_found, ngw_webtest_app, override):
    with override(origins_match):
        url = "/api/resource/%d" % (2**31 if not_found else 0)
        headers = {"Origin": origin, "Access-Control-Request-Method": "OPTIONS"}
        resp = ngw_webtest_app.options(url, headers=headers, status="*")

        h = lambda s: resp.headers.get(f"Access-Control-Allow-{s}")
        assert h("Credentials") == ("true" if match else None)
        assert h("Origin") == (origin if match else None)
        assert h("Methods") == ("OPTIONS" if match else None)
        assert not match or "Content-Type" in h("Headers").split(", ")


def test_wildcard(ngw_webtest_app, override):
    with override(["https://*.one.com", "https://*.sub.two.com"]):

        def test_origin(origin, ok):
            headers = {"Origin": origin}
            resp = ngw_webtest_app.get("/api/resource/0", headers=headers)
            h = lambda s: resp.headers.get(f"Access-Control-Allow-{s}")
            assert h("Credentials") == ("true" if ok else None)
            assert h("Origin") == (origin if ok else None)

        test_origin("https://one.com", True)
        test_origin("http://one.com", False)
        test_origin("http://one.com:12345", False)
        test_origin("https://sub.one.com", True)
        test_origin("https://sub.sub.one.com", True)
        test_origin("https://two.com", False)
        test_origin("https://sub.two.com", True)
        test_origin("https://other.two.com", False)
        test_origin("https://sub.sub.two.com", True)
