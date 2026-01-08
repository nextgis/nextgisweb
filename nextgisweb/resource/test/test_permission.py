import pytest
import sqlalchemy.sql as sql
import transaction
from sqlalchemy.exc import OperationalError

from nextgisweb.env import DBSession

from nextgisweb.auth import Group, User
from nextgisweb.pyramid.test import WebTestApp

from ..model import Resource, ResourceACLRule, ResourceGroup
from ..presolver import PermissionResolver
from ..scope import ResourceScope
from . import ResourceAPI

pytestmark = pytest.mark.usefixtures("ngw_auth_administrator")


@pytest.fixture(scope="module")
def user_id(ngw_resource_group):
    with transaction.manager:
        user = User.test_instance().persist()

    DBSession.query(Resource).filter_by(
        id=ngw_resource_group,
    ).update(dict(owner_user_id=user.id))

    yield user.id


@pytest.mark.usefixtures("ngw_webtest_app")
def test_change_owner(ngw_resource_group_sub, user_id):
    rapi = ResourceAPI()

    admin = User.filter_by(keyname="administrator").one()

    payload = {"resource": {"owner_user": {"id": user_id}}}
    rapi.update_request(ngw_resource_group_sub, payload, status=200)

    with transaction.manager:
        ResourceACLRule(
            resource_id=ngw_resource_group_sub,
            principal=admin,
            identity=ResourceGroup.identity,
            scope=ResourceScope.identity,
            permission="update",
            action="deny",
        ).persist()

    rapi.update_request(ngw_resource_group_sub, payload, status=403)


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
@pytest.mark.usefixtures("ngw_txn")
def test_permission_requirement(resolve):
    # Temporary allow creating custom resource roots
    try:
        DBSession.execute(
            sql.text(
                "SET LOCAL lock_timeout = 1;"
                "ALTER TABLE resource DROP CONSTRAINT resource_check;"
                "SET LOCAL lock_timeout TO DEFAULT;"
            )
        )
    except OperationalError as exc:
        if exc.orig.__class__.__name__ == "LockNotAvailable":
            pytest.skip("Unable to acquire lock to alter resource table")
        raise

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


@pytest.mark.usefixtures("ngw_webtest_app")
def test_admin_permissions(admin, ngw_resource_group, ngw_cleanup):
    rapi = ResourceAPI()
    permissions = rapi.read(0)["resource"]["permissions"]

    def check(data, status, *, resource_id=0):
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
            rapi.update_request(
                resource_id,
                {"resource": {"permissions": permissions + [perm_data]}},
                status=status,
            )

    check({}, 422)
    check({}, 422, resource_id=ngw_resource_group)
    check({"permission": "manage_children"}, 200)
    check({"scope": "metadata", "permission": "read"}, 200)
    check({"scope": "resource", "permission": "read"}, 422)
    check({"scope": "resource", "permission": "update"}, 422)
    check({"scope": "resource", "permission": "change_permissions"}, 422)


@pytest.mark.parametrize("permission", ["create", "manage_children"])
def test_create(
    permission, ngw_resource_group_sub, ngw_resource_group, ngw_webtest_app: WebTestApp
):
    uid = ngw_webtest_app.get("/api/component/auth/current_user").json["id"]
    rapi = ResourceAPI()

    rapi.update_request(
        ngw_resource_group_sub,
        {
            "resource": {
                "permissions": [
                    {
                        "action": "deny",
                        "identity": "resource_group",
                        "scope": "resource",
                        "permission": permission,
                        "propagate": True,
                        "principal": {"id": uid},
                    },
                ],
            },
        },
    )

    # Create new resource inside
    rapi.create_request(
        "resource_group",
        {"resource": {"parent": {"id": ngw_resource_group_sub}}},
        status=403,
    )

    # Move existing resource
    rapi.update_request(
        rapi.create(
            "resource_group",
            {"resource": {"parent": {"id": ngw_resource_group}}},
        ),
        {"resource": {"parent": {"id": ngw_resource_group_sub}}},
        status=403,
    )
