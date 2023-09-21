import pytest
import transaction

from nextgisweb.env import DBSession

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
        obj = WebMap(root_item=WebMapItem(item_type="root")).persist()
        DBSession.flush()
        DBSession.expunge(obj)

    yield obj


def test_annotation_post_get(webmap, ngw_webtest_app):
    result = ngw_webtest_app.post_json(
        "/api/resource/%d/annotation/" % webmap.id, ANNOTATION_SAMPLE
    )

    aid = result.json["id"]
    assert aid > 0

    adata = ngw_webtest_app.get("/api/resource/%d/annotation/%d" % (webmap.id, aid)).json
    del adata["id"]

    assert adata == ANNOTATION_SAMPLE
