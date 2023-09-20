import pytest


@pytest.fixture(scope="function")
def get(ngw_env, ngw_webtest_app):
    root = "/static/" + ngw_env.pyramid.static_key[1:]

    def test(name):
        ngw_webtest_app.get(f"{root}/{name}")

    return test


def test_asset(get):
    get("asset/pyramid/nextgis.png")


def test_amd_file(get):
    get("dojo/dojo.js")
    get("ngw-pyramid/nop.js")
