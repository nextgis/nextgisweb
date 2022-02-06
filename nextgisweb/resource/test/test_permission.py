import pytest
import sqlalchemy.sql as sql
import transaction

from ...auth import Group, User
from ...models import DBSession
from ...resource import ACLRule, Resource, ResourceGroup, ResourceScope
from ...webmap import WebMap, WebMapItem, WebMapScope
from ..presolver import PermissionResolver


@pytest.fixture(scope='module')
def user_id(ngw_resource_group):
    with transaction.manager:
        user = User(
            keyname='test_user',
            display_name='Test User',
        ).persist()

    DBSession \
        .query(Resource) \
        .filter_by(id=ngw_resource_group) \
        .update(dict(owner_user_id=user.id))

    yield user.id

    with transaction.manager:
        DBSession.delete(User.filter_by(id=user.id).one())


def test_change_owner(ngw_resource_group, user_id, ngw_webtest_app, ngw_auth_administrator):
    url = '/api/resource/%d' % ngw_resource_group

    def owner_data(owner_id):
        return dict(resource=dict(owner_user=dict(id=owner_id)))

    admin = User.filter_by(keyname='administrator').one()

    ngw_webtest_app.put_json(url, owner_data(admin.id), status=200)

    with transaction.manager:
        ACLRule(
            resource_id=ngw_resource_group,
            principal=admin,
            identity=ResourceGroup.identity,
            scope=ResourceScope.identity,
            permission='update',
            action='deny',
        ).persist()

    ngw_webtest_app.put_json(url, owner_data(user_id), status=403)


@pytest.mark.parametrize('resolve', (
    pytest.param(lambda r, u: r.permissions(u), id='legacy'),
    pytest.param(lambda r, u: {
        p for p, v in PermissionResolver(r, u)._result.items()
        if v is True}, id='presolver'),
))
def test_permission_requirement(ngw_txn, resolve):
    # Temporary allow creating custom resource roots
    DBSession.execute(sql.text(
        "ALTER TABLE resource DROP CONSTRAINT resource_check"))

    administrators = Group.filter_by(keyname="administrators").one()
    administrator = User.filter_by(keyname="administrator").one()
    everyone = User.filter_by(keyname="everyone").one()
    guest = User.filter_by(keyname="guest").one()

    rg = ResourceGroup(
        parent=None, display_name="Test resource group",
        owner_user=administrator,
    ).persist()
    assert resolve(rg, administrator) == set()

    rg.acl.append(ACLRule(
        action='allow', principal=administrators,
        identity='', scope='', permission='',
        propagate=True))
    assert len(resolve(rg, administrator)) > 5

    rg.acl.append(ACLRule(
        action='allow', principal=everyone,
        identity='', scope='resource', permission='read',
        propagate=True))
    rg.acl.append(ACLRule(
        action='allow', principal=everyone,
        identity='', scope='webmap', permission='display',
        propagate=True))
    assert resolve(rg, guest) == {ResourceScope.read}

    sg = ResourceGroup(
        parent=rg, display_name="Test resource subgroup",
        owner_user=administrator,
    ).persist()
    assert resolve(sg, guest) == {ResourceScope.read}

    # Webmap has webmap.display -> resource.read -> resource.read@parent
    # permission dependency, and these dependencies should be sorted
    # topologically.
    wm = WebMap(
        parent=rg, display_name="Test webmap",
        owner_user=administrator,
        root_item=WebMapItem(item_type='root'),
    ).persist()
    assert resolve(wm, guest) == {ResourceScope.read, WebMapScope.display}

    rg.acl.append(ACLRule(
        action='deny', principal=guest,
        identity='', scope='resource', permission='read',
        propagate=False))

    assert resolve(rg, guest) == set()
    assert resolve(sg, guest) == set()
    assert resolve(wm, guest) == set()
