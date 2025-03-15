import pytest
import transaction

from .. import WebMap, WebMapItem

pytestmark = pytest.mark.usefixtures("ngw_resource_defaults", "ngw_auth_administrator")

ANNOTATION_SAMPLE = dict(
    description="1",
    geom="POINT (0 0)",
    public=True,
    own=False,
    style=dict(string="string", int=0, bool=True, none=None),
)


@pytest.fixture(scope="module", autouse=True)
def enable_annotation(ngw_env):
    with ngw_env.webmap.options.override(annotation=True):
        yield None


@pytest.fixture(scope="module")
def webmap(ngw_env):
    with transaction.manager:
        obj = WebMap(
            root_item=WebMapItem(item_type="root"),
        ).persist()

    yield obj.id


def test_annotation_post_get(webmap, ngw_webtest_app):
    aid = ngw_webtest_app.post_json(
        f"/api/resource/{webmap}/annotation/",
        ANNOTATION_SAMPLE,
    ).json["id"]

    aurl = f"/api/resource/{webmap}/annotation/{aid}"
    adata = ngw_webtest_app.get(aurl).json
    del adata["id"]
    assert adata == ANNOTATION_SAMPLE

    danger_html = '<a href="javascript:alert()">XSS</a><b>Foo'
    safe_html = "<a>XSS</a><b>Foo</b>"
    ngw_webtest_app.put_json(aurl, dict(description=danger_html))

    adata = ngw_webtest_app.get(aurl).json
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
def test_options(options, ok, webmap, ngw_webtest_app):
    url = f"/api/resource/{webmap}"

    ngw_webtest_app.put_json(url, dict(webmap=dict(options=options)), status=200 if ok else 422)
    if not ok:
        return

    data = ngw_webtest_app.get(url, status=200).json
    assert data["webmap"]["options"] == options
