from unittest.mock import ANY

import pytest

from nextgisweb.resource.test import WebTestApp

pytestmark = pytest.mark.usefixtures("ngw_auth_administrator", "ngw_resource_defaults")


def test_resource_group(ngw_webtest_app: WebTestApp, ngw_resource_group_sub, ngw_resource_group):
    api = ngw_webtest_app.with_url("/api/component/resource/attr")

    resp_json = api.post(
        json={
            "resources": [ngw_resource_group_sub],
            "attributes": [
                ["resource.cls"],
                ["resource.parent"],
                ["resource.parents"],
                ["resource.display_name"],
                ["resource.is_deletable"],
                ["resource.has_permission", "resource.read"],
                ["resource.has_permission", "data.read"],
            ],
        }
    ).json

    assert resp_json == {
        "items": [
            [
                ngw_resource_group_sub,
                [
                    [0, "resource_group"],
                    [0, {"id": ngw_resource_group}],
                    [0, [{"id": 0}, {"id": ngw_resource_group}]],
                    [0, ANY],
                    [0, True],
                    [0, True],
                    [0, False],
                ],
            ],
        ],
    }

    resp_json = api.post(
        json={
            "resources": [ngw_resource_group],
            "attributes": [
                ["resource.children_creatable"],
                ["resource.summary"],
            ],
        }
    ).json

    resp_item = resp_json["items"][0]

    assert resp_item[0] == ngw_resource_group
    assert "resource_group" in resp_item[1][0][1]
    assert isinstance(resp_item[1][0][1], list)

    resp_items = api.post(
        json={
            "resources": {"root": ngw_resource_group},
            "attributes": [
                ["resource.cls"],
                ["resource.parent"],
                ["resource.display_name"],
            ],
        }
    ).json["items"]

    assert len(resp_items) >= 2
    assert any(i[0] == ngw_resource_group_sub for i in resp_items)
