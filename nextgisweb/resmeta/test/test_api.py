import pytest
import transaction

from nextgisweb.env import DBSession

from nextgisweb.resource import ResourceGroup

pytestmark = pytest.mark.usefixtures("ngw_resource_defaults", "ngw_auth_administrator")


@pytest.fixture
def resource_id():
    with transaction.manager:
        res = ResourceGroup().persist()

        DBSession.flush()
        DBSession.expunge(res)

    yield res.id


def test_items(ngw_webtest_app, resource_id):
    items = dict(key1="text1", key2="text2")

    res_url = "/api/resource/%d" % resource_id

    resp = ngw_webtest_app.get(res_url, status=200)
    assert resp.json["resmeta"]["items"] == dict()

    data = dict(resmeta=dict(items=items))
    ngw_webtest_app.put_json(res_url, data, status=200)

    resp = ngw_webtest_app.get(res_url, status=200)
    assert resp.json["resmeta"]["items"] == items

    del items["key2"]
    ngw_webtest_app.put_json(res_url, data, status=200)

    resp = ngw_webtest_app.get(res_url, status=200)
    assert resp.json["resmeta"]["items"] == items


@pytest.mark.parametrize(
    "value",
    ("text", -123, 4.5, True, False, None),
)
def test_item_type(value, ngw_webtest_app, resource_id):
    res_url = "/api/resource/%d" % resource_id

    items = dict(key=value)
    data = dict(resmeta=dict(items=items))

    ngw_webtest_app.put_json(res_url, data, status=200)

    resp = ngw_webtest_app.get(res_url, status=200)
    value_saved = resp.json["resmeta"]["items"]["key"]

    if value is None:
        assert value_saved is None
    elif isinstance(value, float):
        assert value_saved == pytest.approx(value)
    else:
        assert value_saved == value
