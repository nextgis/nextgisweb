import pytest
import sqlalchemy.sql as sql
import transaction

from nextgisweb.env import DBSession

from nextgisweb.auth import Group, User
from nextgisweb.webmap import WebMap, WebMapItem, WebMapScope

from ..model import Resource, ResourceACLRule, ResourceGroup
from ..presolver import PermissionResolver
from ..scope import ResourceScope

pytestmark = pytest.mark.usefixtures("ngw_auth_administrator")


@pytest.fixture(scope="module")
def user_id(ngw_resource_group):
    with transaction.manager:
        user = User(
            keyname="test_user",
            display_name="Test User",
        ).persist()

    DBSession.query(Resource).filter_by(
        id=ngw_resource_group,
    ).update(dict(owner_user_id=user.id))

    yield user.id

    with transaction.manager:
        DBSession.delete(User.filter_by(id=user.id).one())


def test_change_owner(ngw_resource_group, user_id, ngw_webtest_app):
    url = "/api/resource/%d" % ngw_resource_group

    def owner_data(owner_id):
        return dict(resource=dict(owner_user=dict(id=owner_id)))

    admin = User.filter_by(keyname="administrator").one()

    ngw_webtest_app.put_json(url, owner_data(admin.id), status=200)

    with transaction.manager:
        ResourceACLRule(
            resource_id=ngw_resource_group,
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

    # Webmap has webmap.display -> resource.read -> resource.read@parent
    # permission dependency, and these dependencies should be sorted
    # topologically.
    wm = WebMap(
        parent=rg,
        display_name="Test webmap",
        owner_user=administrator,
        root_item=WebMapItem(item_type="root"),
    ).persist()
    assert resolve(wm, guest) == {ResourceScope.read, WebMapScope.display}

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
    assert resolve(wm, guest) == set()


@pytest.fixture
def admin():
    with transaction.manager:
        admin = User(
            keyname="test_admin",
            display_name="Test admin",
            member_of=[Group.filter_by(keyname="administrators").one()],
        ).persist()
    try:
        yield admin.id
    finally:
        with transaction.manager:
            ResourceACLRule.filter_by(principal_id=admin.id).delete()
            DBSession.delete(User.filter_by(id=admin.id).one())


def test_admin_permissions(admin, ngw_webtest_app, ngw_resource_group):
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
