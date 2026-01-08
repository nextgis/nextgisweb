from contextlib import contextmanager
from secrets import token_urlsafe

import pytest
import transaction
from sqlalchemy import func

from nextgisweb.env import DBSession

from nextgisweb.pyramid.test import WebTestApp

from .. import Resource, ResourceGroup
from . import ResourceAPI

pytestmark = pytest.mark.usefixtures("ngw_resource_defaults", "ngw_auth_administrator")


@pytest.fixture(scope="module")
def disable(ngw_env):
    resource = ngw_env.resource

    @contextmanager
    def _disable(*resource_cls):
        mem = resource.disabled_resource_cls
        resource.disabled_resource_cls = list(set(mem).union(set(resource_cls)))
        try:
            yield
        finally:
            resource.disabled_resource_cls = mem

    return _disable


@pytest.fixture(scope="module")
def quota(ngw_env):
    comp = ngw_env.resource

    @contextmanager
    def _quota(**kw):
        options = dict(limit=None, resource_cls=None, resource_by_cls=dict())
        options.update(kw)

        mem = dict()
        for k, v in options.items():
            attr = f"quota_{k}"
            mem[attr] = getattr(comp, attr)
            setattr(comp, attr, v)
        try:
            yield
        finally:
            for k, v in mem.items():
                setattr(comp, k, v)

    return _quota


@pytest.mark.usefixtures("ngw_webtest_app")
def test_disable_resources(disable):
    rapi = ResourceAPI()
    rapi.create_request("resource_group", {}, status=201)

    with disable("resource_group"):
        rapi.create_request("resource_group", {}, status=422)


@pytest.mark.parametrize("cls", ("vector_layer", "postgis_connection"))
@pytest.mark.usefixtures("ngw_webtest_app")
def test_incomplete_create(cls):
    # Vector layer and PostGIS connection require some mandatory fields on
    # creation, and omission of these fields must cause validation errors.
    ResourceAPI().create_request(cls, {}, status=422)


@pytest.fixture(scope="module")
def resource():
    with transaction.manager:
        obj = ResourceGroup(
            display_name="狗子有佛性也無",
            keyname="Test-Keyname",
        ).persist()
    yield obj


def test_resource_search(resource, ngw_webtest_app: WebTestApp):
    api = ngw_webtest_app.with_url("/api/resource/search/")

    resp_json = api.get(query=dict(display_name="狗子有佛性也無")).json
    assert len(resp_json) == 1

    resp_json = api.get(query=dict(display_name="狗子有佛性也無", keyname="foo")).json
    assert resp_json == []

    resp_json = api.get(query=dict(display_name__ilike="%佛%")).json
    assert len(resp_json) == 1
    assert resp_json[0]["resource"]["display_name"] == resource.display_name


@pytest.fixture(scope="module")
def resources():
    prefix = f"test_{token_urlsafe(6)}"
    # R - A
    #   - B - C
    #       - D
    with transaction.manager:
        r = ResourceGroup(keyname=f"{prefix}_R").persist()
        ResourceGroup(parent=r, keyname=f"{prefix}_A").persist()

        b = ResourceGroup(parent=r, keyname=f"{prefix}_B").persist()

        ResourceGroup(parent=b, keyname=f"{prefix}_C").persist()
        ResourceGroup(parent=b, keyname=f"{prefix}_D").persist()

    yield prefix


@pytest.mark.parametrize(
    "root_keyname, keynames_expected",
    (
        ("R", {"R", "A", "B", "C", "D"}),
        ("B", {"B", "C", "D"}),
    ),
)
def test_resource_search_parent_id_recursive(
    resources,
    root_keyname,
    keynames_expected,
    ngw_webtest_app: WebTestApp,
):
    prefix = resources
    api = ngw_webtest_app.with_url("/api/resource/search/")

    resp = api.get(query={"keyname": f"{prefix}_{root_keyname}"})
    root_id = resp.json[0]["resource"]["id"]

    resp = api.get(query={"parent_id__recursive": root_id})
    keynames = {item["resource"]["keyname"] for item in resp.json}
    assert keynames == {f"{prefix}_{item}" for item in keynames_expected}


@pytest.fixture
def resource_stat():
    with DBSession.no_autoflush:
        cls_count = dict(
            (cls, count)
            for cls, count in DBSession.query(
                Resource.cls,
                func.count(Resource.id),
            ).group_by(Resource.cls)
        )
    total = sum(cls_count.values())
    yield total, cls_count


def test_quota(quota, disable, resource_stat, ngw_webtest_app: WebTestApp):
    total, cls_count = resource_stat
    rapi = ResourceAPI()

    def create_resource_group(status):
        resp = rapi.create_request("resource_group", {}, status=status)
        if resp.status_code == 201:
            rapi.delete(resp.json["id"])

    def check(data, status, expected_result=None):
        resp = ngw_webtest_app.post(
            "/api/component/resource/check_quota",
            json=data,
            status=status,
        )
        if expected_result is not None:
            assert expected_result.items() <= resp.json.items()

    with quota():
        check({"resource_group": 999}, 200)
        create_resource_group(201)  # No quota limits

        check({"invalid": 1}, 422)  # Resource class validated
        check({"invalid": 0}, 422)  # Even if zero

        with disable("resource_group"):
            create_resource_group(422)  # Disabled classes can't be created
            check({"resource_group": 0}, 200)  # Zero passes quota check
            check({"resource_group": 1}, 422)  # And fails for non-zero

    with quota(limit=total):
        check({"resource_group": 0}, 200)
        check({"resource_group": 1}, 402, {"cls": None, "required": 1, "available": 0})
        create_resource_group(402)

    rg_count = cls_count.get("resource_group", 0)

    with quota(limit=rg_count, resource_cls=["resource_group"]):
        check({"resource_group": 0}, 200)
        check({"resource_group": 1}, 402, {"cls": None, "required": 1, "available": 0})
        create_resource_group(402)

    # Quota set for another resource classes shouldn't affect resource_group
    with quota(limit=rg_count, resource_cls=["another_resource_cls"]):
        check({"resource_group": 999}, 200)
        create_resource_group(201)

    # Quota set to exact current count should block any new creations
    with quota(resource_by_cls=dict(resource_group=rg_count)):
        check({"resource_group": 0}, 200)
        check({"resource_group": 1}, 402, {"cls": "resource_group", "required": 1, "available": 0})
        create_resource_group(402)

    # Quota set for another resource classes shouldn't affect resource_group
    with quota(resource_by_cls=dict(another_resource_cls=rg_count)):
        check({"resource_group": 999}, 200)
        create_resource_group(201)

    # Quota slightly above current count should allow some creations
    with quota(limit=total + 5):
        check({"resource_group": 5}, 200)
        check({"resource_group": 6}, 402, {"cls": None, "required": 6, "available": 5})

    # Same, but quota only for resource_group
    with quota(limit=rg_count + 5, resource_cls=["resource_group"]):
        check({"resource_group": 5}, 200)
        check({"resource_group": 7}, 402, {"cls": None, "required": 7, "available": 5})


@pytest.mark.usefixtures("ngw_webtest_app")
def test_description_sanitization():
    rapi = ResourceAPI()
    description_unsafe = '<a href="javascript:alert(0)">Link'
    res_id = rapi.create(
        "resource_group",
        {"resource": {"description": description_unsafe}},
    )

    description_written = rapi.read(res_id)["resource"]["description"]
    assert description_written == "<a>Link</a>"
