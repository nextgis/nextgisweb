import pytest
import transaction

from ...auth import User
from ...models import DBSession

from .. import ResourceGroup


def test_disable_resources(
    ngw_env, ngw_webtest_app,
    ngw_auth_administrator, ngw_resource_group
):
    def create_resource_group(display_name, expected_status):
        ngw_webtest_app.post_json('/api/resource/', dict(resource=dict(
            cls='resource_group', parent=dict(id=ngw_resource_group),
            display_name=display_name)
        ), status=expected_status)

    with ngw_env.resource.options.override({'disable.resource_group': True}):
        create_resource_group('disable.resource_group', 422)

    with ngw_env.resource.options.override({'disabled_cls': ['resource_group', ]}):
        create_resource_group('diabled_cls', 422)


@pytest.fixture(scope='module')
def resource(ngw_resource_group):
    with transaction.manager:
        obj = ResourceGroup(
            parent_id=ngw_resource_group, display_name='Test Юникод Symbols ~%',
            keyname='Test-Keyname',
            owner_user=User.by_keyname('administrator'),
        ).persist()

        DBSession.flush()
        DBSession.expunge(obj)

    yield obj

    with transaction.manager:
        DBSession.delete(ResourceGroup.filter_by(id=obj.id).one())


def test_resource_search(resource, ngw_webtest_app, ngw_auth_administrator):
    api_url = '/api/resource/search/'

    resp = ngw_webtest_app.get(api_url, dict(
        display_name='Test Юникод Symbols ~%'), status=200)
    assert len(resp.json) == 1

    resp = ngw_webtest_app.get(api_url, dict(
        display_name='Test Юникод Symbols ~%', keyname='other'), status=200)
    assert len(resp.json) == 0

    resp = ngw_webtest_app.get(api_url, dict(
        display_name__ilike='test юни%'), status=200)
    assert len(resp.json) == 1
    assert resp.json[0]['resource']['display_name'] == resource.display_name


@pytest.fixture(scope='module')
def resources(ngw_resource_group):
    # R - A
    #   - B - C
    #       - D
    with transaction.manager:
        admin = User.by_keyname('administrator')
        res_R = ResourceGroup(
            parent_id=ngw_resource_group, display_name='Test resource ROOT',
            keyname='test_res_R', owner_user=admin,
        ).persist()
        res_A = ResourceGroup(
            parent=res_R, display_name='Test resource A',
            keyname='test_res_A', owner_user=admin,
        ).persist()
        res_B = ResourceGroup(
            parent=res_R, display_name='Test resource B',
            keyname='test_res_B', owner_user=admin,
        ).persist()
        res_C = ResourceGroup(
            parent=res_B, display_name='Test resource C',
            keyname='test_res_C', owner_user=admin,
        ).persist()
        res_D = ResourceGroup(
            parent=res_B, display_name='Test resource D',
            keyname='test_res_D', owner_user=admin,
        ).persist()
        DBSession.flush()

    yield

    with transaction.manager:
        DBSession.delete(res_D)
        DBSession.delete(res_C)
        DBSession.delete(res_B)
        DBSession.delete(res_A)
        DBSession.delete(res_R)


@pytest.mark.parametrize('root_keyname, keynames_expected', (
    ('test_res_R', {'test_res_R', 'test_res_A', 'test_res_B', 'test_res_C', 'test_res_D'}),
    ('test_res_B', {'test_res_B', 'test_res_C', 'test_res_D'}),
))
def test_resource_search_parent_id_recursive(
    resources, root_keyname, keynames_expected, ngw_webtest_app,
    ngw_auth_administrator
):
    response = ngw_webtest_app.get('/api/resource/search/', dict(keyname=root_keyname))
    root_id = response.json[0]['resource']['id']

    data = ngw_webtest_app.get('/api/resource/search/', dict(parent_id__recursive=root_id)).json
    keynames = {item['resource']['keyname'] for item in data}

    assert keynames == keynames_expected
