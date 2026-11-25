import pytest

from nextgisweb.pyramid.test import WebTestApp


@pytest.fixture(scope="function")
def get(ngw_env, ngw_webtest_app: WebTestApp):
    root = "/static/" + ngw_env.pyramid.static_key[1:]

    def test(name, *, status=200):
        ngw_webtest_app.get(f"{root}/{name}", status=status)

    return test


def test_static(get, subtests):
    valid = "asset/pyramid/nextgis.png"
    parts = valid.split("/")

    with subtests.test("valid"):
        get(valid, status=200)
        get(f"{valid}?foo=bar", status=200)

    with subtests.test("directory"):
        directory = "/".join(parts[:-1])
        get(directory, status=404)

    with subtests.test("slashes"):
        get(f"/{valid}", status=400)
        get(f"{valid}/", status=400)

    with subtests.test("traversal"):
        init_py = "/".join([*parts[:-1], "../__init__.py"])
        get(init_py, status=400)
