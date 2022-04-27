import geoalchemy2 as ga
import pytest
import transaction
from pyramid.interfaces import ISecurityPolicy

from nextgisweb.auth import User
from nextgisweb.models import DBSession
from nextgisweb.resource import ACLRule, ResourceGroup
from nextgisweb.resource.model import ResourceACLRule
from nextgisweb.webmap.model import WebMap, WebMapItem, WebMapAnnotation

TEST_USER_KEYNAME = 'test_user'


def make_annotation_json(public: bool):
    return dict(
        description='description', geom='POINT (0 0)', public=public,
        style=dict(string='string', int=0, bool=True, none=None)
    )


def make_annotation(webmap, public, user_id):
    return WebMapAnnotation(
        webmap=webmap,
        geom=ga.elements.WKTElement('POINT (0 0)', srid=3857),
        public=public,
        user_id=user_id
    ).persist()


def append_acl(resource, action, principal, scope, permission, identity):
    resource.acl.append(ACLRule(
        principal=principal,
        identity=identity,
        scope=scope,
        permission=permission,
        action=action)
    )


@pytest.fixture(scope='module')
def webmap_id(ngw_resource_group):
    with transaction.manager:
        user = User(
            keyname=TEST_USER_KEYNAME,
            display_name='Test User',
        ).persist()

        test_root_resource = ResourceGroup.filter_by(id=0).one()
        append_acl(test_root_resource, 'allow', user, 'resource', 'read', ResourceGroup.identity)

        test_resource_group = ResourceGroup.filter_by(id=ngw_resource_group).one()
        append_acl(test_resource_group, 'allow', user, 'resource', 'read', ResourceGroup.identity)

        webmap = WebMap(
            parent_id=ngw_resource_group,
            display_name=__name__,
            owner_user=user,
            root_item=WebMapItem(item_type='root')
        ).persist()

        append_acl(webmap, 'allow', user, 'resource', 'read', WebMap.identity)
        append_acl(webmap, 'allow', user, 'webmap', 'annotation_read', WebMap.identity)
        append_acl(webmap, 'allow', user, 'webmap', 'annotation_write', WebMap.identity)

        user_admin_id = User.by_keyname('administrator').id
        make_annotation(webmap, public=True, user_id=user_admin_id)
        make_annotation(webmap, public=False, user_id=user_admin_id)

        make_annotation(webmap, public=True, user_id=user.id)
        make_annotation(webmap, public=False, user_id=user.id)

    DBSession.flush()

    yield webmap.id

    with transaction.manager:
        DBSession.query(ResourceACLRule).filter(ResourceACLRule.principal_id == user.id).delete()
        DBSession.delete(WebMap.filter_by(id=webmap.id).one())
        DBSession.delete(User.filter_by(id=user.id).one())


@pytest.fixture()
def ngw_auth_test_user(ngw_pyramid_config):
    policy = ngw_pyramid_config.registry.getUtility(ISecurityPolicy)

    assert policy.test_user is None, "Security policy test_used is already defined!"

    policy.test_user = TEST_USER_KEYNAME
    yield
    policy.test_user = None


def test_no_admin_annotations_should_view_only_public_annotations_and_own_private(ngw_webtest_app, ngw_auth_test_user,
                                                                                  webmap_id):
    annotations = ngw_webtest_app.get('/api/resource/%d/annotation/' % webmap_id).json
    assert len(annotations) == 3

    public_annotations = list(filter(lambda a: a['public'] is True, annotations))
    assert len(public_annotations) == 2

    private_annotations = list(filter(lambda a: a['public'] is False, annotations))
    assert len(private_annotations) == 1


def test_admin_annotations_should_view_all_annotations(ngw_webtest_app, ngw_auth_administrator,
                                                       webmap_id):
    annotations = ngw_webtest_app.get('/api/resource/%d/annotation/' % webmap_id).json
    assert len(annotations) == 4

    public_annotations = list(filter(lambda a: a['public'] is True, annotations))
    assert len(public_annotations) == 2

    private_annotations = list(filter(lambda a: a['public'] is False, annotations))
    assert len(private_annotations) == 2
