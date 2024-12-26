import pytest
import transaction

from nextgisweb.env import DBSession

from nextgisweb.auth import User

from .. import ResourceACLRule, ResourceGroup

pytestmark = pytest.mark.usefixtures("ngw_resource_defaults")


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
        user = User(
            keyname="duser",
            password="dpass",
            display_name="test-resource-delete",
        ).persist()

        DBSession.flush()

        _add_perm(user.id, 0, "read")
        _add_perm(user.id, ngw_resource_group, "read")
        _add_perm(user.id, group1, "read")

    yield user.id

    with transaction.manager:
        DBSession.delete(user)


def test_delete(group1, group2, user, ngw_webtest_app):
    url = f"/api/resource/delete?resources={group1},{group2}"

    def req_get():
        resp = ngw_webtest_app.get(url, status=200)
        return resp.json

    def req_post(*, partial, status):
        resp = ngw_webtest_app.post(
            url + "&partial=" + ("yes" if partial else "no"), status=status
        )
        return resp.json

    def check_exists(rid, exists):
        ngw_webtest_app.get(f"/api/resource/{rid}", status=200 if exists else 404)

    assert req_get() == dict(
        affected=dict(count=0, resources=dict()),
        unaffected=dict(count=2, resources=dict(resource=2)),
    )

    ngw_webtest_app.authorization = ("Basic", ("duser", "dpass"))

    assert req_get() == dict(
        affected=dict(count=0, resources=dict()),
        unaffected=dict(count=2, resources=dict(resource=1, resource_group=1)),
    )

    with transaction.manager:
        _add_perm(user, group1, "delete")
        _add_perm(user, group1, "manage_children")
    data = dict(
        affected=dict(count=1, resources=dict(resource_group=1)),
        unaffected=dict(count=1, resources=dict(resource=1)),
    )
    assert req_get() == data

    req_post(partial=False, status=403)
    assert req_post(partial=True, status=200) == dict()

    ngw_webtest_app.authorization = ("Basic", ("administrator", "admin"))

    check_exists(group1, False)
    check_exists(group2, True)

    assert req_get() == dict(
        affected=dict(count=1, resources=dict(resource_group=1)),
        unaffected=dict(count=1, resources=dict(resource=1)),
    )
