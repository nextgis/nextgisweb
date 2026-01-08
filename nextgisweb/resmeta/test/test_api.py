import pytest

from nextgisweb.resource.test import ResourceAPI

pytestmark = pytest.mark.usefixtures(
    "ngw_auth_administrator",
    "ngw_resource_defaults",
    "ngw_webtest_app",
)


def test_items():
    rapi = ResourceAPI()
    res_id = rapi.create("resource_group", {})
    assert rapi.read(res_id)["resmeta"]["items"] == dict()

    items = {"key1": "foo", "key2": "bar"}
    rapi.update(res_id, {"resmeta": {"items": items}})
    assert rapi.read(res_id)["resmeta"]["items"] == items

    items = {"key1": "foo"}
    rapi.update(res_id, {"resmeta": {"items": items}})
    assert rapi.read(res_id)["resmeta"]["items"] == items


@pytest.mark.parametrize(
    "value",
    ("text", -123, 4.5, True, False, None),
)
def test_item_type(value):
    rapi = ResourceAPI()
    items = dict(key=value)

    res_id = rapi.create("resource_group", {"resmeta": {"items": items}})
    value_saved = rapi.read(res_id)["resmeta"]["items"]["key"]

    if value is None:
        assert value_saved is None
    elif isinstance(value, float):
        assert value_saved == pytest.approx(value)
    else:
        assert value_saved == value
