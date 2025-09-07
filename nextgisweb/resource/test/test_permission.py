from secrets import token_urlsafe

import pytest
import sqlalchemy.sql as sql
import transaction

from nextgisweb.env import DBSession

from nextgisweb.auth import Group, User

from ..model import Resource, ResourceACLRule, ResourceGroup
from ..presolver import PermissionResolver
from ..scope import ResourceScope

pytestmark = pytest.mark.usefixtures("ngw_auth_administrator")


@pytest.fixture(scope="module")
def user_id(ngw_resource_group):
    with transaction.manager:
        user = User.test_instance().persist()

    DBSession.query(Resource).filter_by(
        id=ngw_resource_group,
    ).update(dict(owner_user_id=user.id))

    yield user.id


def test_change_owner(ngw_resource_group_sub, user_id, ngw_webtest_app):
    url = "/api/resource/%d" % ngw_resource_group_sub

    def owner_data(owner_id):
        return dict(resource=dict(owner_user=dict(id=owner_id)))

    admin = User.filter_by(keyname="administrator").one()

    ngw_webtest_app.put_json(url, owner_data(admin.id), status=200)

    with transaction.manager:
        ResourceACLRule(
            resource_id=ngw_resource_group_sub,
            principal=admin,
            identity=ResourceGroup.identity,
            scope=ResourceScope.identity,
            permission="update",
            action="deny",
        ).persist()

    ngw_webtest_app.put_json(url, owner_data(user_id), status=403)


@pytest.mark.parametrize(
    "resolve",
    (
        pytest.param(lambda r, u: r.permissions(u), id="legacy"),
        pytest.param(
            lambda r, u: {p for p, v in PermissionResolver(r, u)._result.items() if v is True},
            id="presolver",
        ),
    ),
)
def test_permission_requirement(ngw_txn, resolve):
    # Temporary allow creating custom resource roots
    DBSession.execute(sql.text("ALTER TABLE resource DROP CONSTRAINT resource_check"))

    administrators = Group.filter_by(keyname="administrators").one()
    administrator = User.filter_by(keyname="administrator").one()
    everyone = User.filter_by(keyname="everyone").one()
    guest = User.filter_by(keyname="guest").one()

    rg = ResourceGroup(
        parent=None,
        display_name="Test resource group",
        owner_user=administrator,
    ).persist()
    assert resolve(rg, administrator) == set()

    rg.acl.append(
        ResourceACLRule(
            action="allow",
            principal=administrators,
            identity="",
            scope="",
            permission="",
            propagate=True,
        )
    )
    assert len(resolve(rg, administrator)) > 5

    rg.acl.append(
        ResourceACLRule(
            action="allow",
            principal=everyone,
            identity="",
            scope="resource",
            permission="read",
            propagate=True,
        )
    )
    rg.acl.append(
        ResourceACLRule(
            action="allow",
            principal=everyone,
            identity="",
            scope="webmap",
            permission="display",
            propagate=True,
        )
    )
    assert resolve(rg, guest) == {ResourceScope.read}

    sg = ResourceGroup(
        parent=rg,
        display_name="Test resource subgroup",
        owner_user=administrator,
    ).persist()
    assert resolve(sg, guest) == {ResourceScope.read}

    rg.acl.append(
        ResourceACLRule(
            action="deny",
            principal=guest,
            identity="",
            scope="resource",
            permission="read",
            propagate=False,
        )
    )

    assert resolve(rg, guest) == set()
    assert resolve(sg, guest) == set()


@pytest.fixture
def admin():
    with transaction.manager:
        administrators = Group.filter_by(keyname="administrators").one()
        admin = User.test_instance(member_of=[administrators]).persist()
    yield admin.id


def test_admin_permissions(admin, ngw_webtest_app, ngw_resource_group, ngw_cleanup):
    permissions = ngw_webtest_app.get("/api/resource/0").json["resource"]["permissions"]

    def check(data, status_expected, *, resource_id=0):
        perm_data = dict(
            action="deny",
            identity="",
            permission="",
            principal=dict(id=admin),
            propagate=False,
            scope="",
        )
        perm_data.update(data)

        with ngw_cleanup.disable():
            ngw_webtest_app.put_json(
                f"/api/resource/{resource_id}",
                dict(resource=dict(permissions=permissions + [perm_data])),
                status=status_expected,
            )

    check(dict(), 422)
    check(dict(), 422, resource_id=ngw_resource_group)
    check(dict(permission="manage_children"), 200)
    check(dict(scope="metadata", permission="read"), 200)
    check(dict(scope="resource", permission="read"), 422)
    check(dict(scope="resource", permission="update"), 422)
    check(dict(scope="resource", permission="change_permissions"), 422)


@pytest.mark.parametrize("permission", ["create", "manage_children"])
def test_create(permission, ngw_resource_group_sub, ngw_resource_group, ngw_webtest_app):
    pid, sid = ngw_resource_group, ngw_resource_group_sub
    uid = ngw_webtest_app.get("/api/component/auth/current_user").json["id"]

    ngw_webtest_app.put_json(
        f"/api/resource/{sid}",
        dict(
            resource=dict(
                permissions=[
                    dict(
                        action="deny",
                        identity="resource_group",
                        scope="resource",
                        permission=permission,
                        propagate=True,
                        principal=dict(id=uid),
                    ),
                ],
            ),
        ),
    )

    # Create new resource

    dn = token_urlsafe(8)
    ngw_webtest_app.post_json(
        "/api/resource/",
        dict(resource=dict(cls="resource_group", parent=dict(id=sid), display_name=dn)),
        status=403,
    )

    # Move existing resource

    dn = token_urlsafe(8)
    cid = ngw_webtest_app.post_json(
        "/api/resource/",
        dict(resource=dict(cls="resource_group", parent=dict(id=pid), display_name=dn)),
        status=201,
    ).json["id"]

    ngw_webtest_app.put_json(
        f"/api/resource/{cid}",
        dict(resource=dict(parent=dict(id=sid))),
        status=403,
    )
