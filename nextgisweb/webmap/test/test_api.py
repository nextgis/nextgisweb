from unittest.mock import ANY

import pytest
import transaction

from nextgisweb.pyramid.test import WebTestApp
from nextgisweb.resource.test import ResourceAPI

from .. import WebMap, WebMapItem

pytestmark = pytest.mark.usefixtures("ngw_resource_defaults", "ngw_auth_administrator")


@pytest.fixture(scope="module", autouse=True)
def enable_annotation(ngw_env):
    with ngw_env.webmap.options.override(annotation=True):
        yield None


@pytest.fixture(scope="module")
def webmap():
    with transaction.manager:
        obj = WebMap(
            root_item=WebMapItem(item_type="root"),
        ).persist()

    yield obj.id


def test_annotation_post_get(webmap, ngw_webtest_app: WebTestApp):
    api = ngw_webtest_app.with_url(f"/api/resource/{webmap}/annotation/")

    payload = {
        "description": "1",
        "geom": "POINT (0 0)",
        "public": True,
        "own": False,
        "style": {"string": "string", "int": 0, "bool": True, "none": None},
    }

    aid = api.post(json=payload).json["id"]

    adata = api.get(aid).json
    assert adata == {"id": ANY, **payload}

    danger_html = '<a href="javascript:alert()">XSS</a><b>Foo'
    safe_html = "<a>XSS</a><b>Foo</b>"
    api.put(aid, json={"description": danger_html})

    adata = api.get(aid).json
    assert adata["description"] == safe_html


@pytest.mark.parametrize(
    "options, ok",
    (
        pytest.param(None, False, id="null"),
        pytest.param(dict(), True, id="empty"),
        pytest.param({"unknown": True}, False, id="unknown-key"),
        pytest.param({"webmap.identification_geometry": "wrong-type"}, False, id="wrong-type"),
        pytest.param({"webmap.identification_geometry": True}, True, id="known"),
    ),
)
def test_options(options, ok, webmap, ngw_webtest_app: WebTestApp):
    rapi = ResourceAPI()

    rapi.update_request(
        webmap,
        {"webmap": {"options": options}},
        status=200 if ok else 422,
    )

    if not ok:
        return

    data = rapi.read(webmap)
    assert data["webmap"]["options"] == options


def test_panorama_provider(ngw_webtest_app: WebTestApp):
    url = "/api/component/pyramid/csettings"
    orig = ngw_webtest_app.get(url, query={"webmap": ["all"]}).json

    def set_api_key(provider, value):
        ngw_webtest_app.put(url, json={"webmap": {f"{provider}_api_panorama_key": value}})
        return ngw_webtest_app.get(url, query={"webmap": ["panorama_provider"]}).json["webmap"][
            "panorama_provider"
        ]

    try:
        assert set_api_key("google", None) is None
        assert set_api_key("yandex", None) is None

        ngw_webtest_app.put(url, json={"webmap": {"yandex_api_panorama_key": ""}}, status=422)

        assert set_api_key("google", "") == "google"
        assert set_api_key("yandex", "test_api_key") == "google"
        assert set_api_key("google", None) == "yandex"
        assert set_api_key("yandex", None) is None
    finally:
        ngw_webtest_app.put(url, json=orig)
