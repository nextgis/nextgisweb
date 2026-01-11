import pytest
import transaction

from nextgisweb.env import DBSession

from nextgisweb.auth import User
from nextgisweb.pyramid.test import WebTestApp

from .. import ResourceACLRule, ResourceGroup
from . import ResourceAPI

pytestmark = pytest.mark.usefixtures(
    "ngw_administrator_password",
    "ngw_disable_oauth",
    "ngw_resource_defaults",
)


@pytest.fixture(scope="module")
def group1(ngw_resource_group):
    with transaction.manager:
        res = ResourceGroup(parent_id=ngw_resource_group).persist()
    yield res.id


@pytest.fixture(scope="module")
def group2(ngw_resource_group):
    with transaction.manager:
        res = ResourceGroup(parent_id=ngw_resource_group).persist()
    yield res.id


def _add_perm(user_id, resource_id, permission):
    ResourceACLRule(
        resource_id=resource_id,
        principal_id=user_id,
        identity="",
        scope="resource",
        permission=permission,
        propagate=False,
        action="allow",
    ).persist()


@pytest.fixture(scope="module")
def user(group1, ngw_resource_group):
    with transaction.manager:
        user = User.test_instance().persist()

        DBSession.flush()

        _add_perm(user.id, 0, "read")
        _add_perm(user.id, ngw_resource_group, "read")
        _add_perm(user.id, group1, "read")

    yield user


def test_delete(group1, group2, user, ngw_webtest_app: WebTestApp):
    rapi = ResourceAPI()
    api = ngw_webtest_app.with_url("/api/resource/delete")
    query_base = dict(resources=[group1, group2])

    _get_json = lambda: api.get(query=dict(query_base)).json

    assert _get_json() == {
        "affected": {"count": 0, "resources": {}},
        "unaffected": {"count": 2, "resources": {"resource": 2}},
    }

    ngw_webtest_app.authorization = ("Basic", (user.keyname, user.password_plaintext))

    assert _get_json() == {
        "affected": {"count": 0, "resources": {}},
        "unaffected": {"count": 2, "resources": {"resource": 1, "resource_group": 1}},
    }

    with transaction.manager:
        _add_perm(user.id, group1, "delete")
        _add_perm(user.id, group1, "manage_children")

    assert _get_json() == {
        "affected": {"count": 1, "resources": {"resource_group": 1}},
        "unaffected": {"count": 1, "resources": {"resource": 1}},
    }

    api.post(query=dict(query_base, partial=False), status=403)
    assert api.post(query=dict(query_base, partial=True)).json == {}

    ngw_webtest_app.authorization = ("Basic", ("administrator", "admin"))

    rapi.read_request(group1, status=404)
    rapi.read_request(group2, status=200)

    assert _get_json() == {
        "affected": {"count": 1, "resources": {"resource_group": 1}},
        "unaffected": {"count": 1, "resources": {"resource": 1}},
    }
