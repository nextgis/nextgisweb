import pytest
import transaction
from sqlalchemy.exc import NoResultFound

from nextgisweb.env import DBSession
from nextgisweb.lib.datetime import utcnow_naive

from nextgisweb.pyramid.test import WebTestApp

from .. import Resource, ResourceGroup
from . import ResourceAPI

pytestmark = pytest.mark.usefixtures("ngw_auth_administrator", "ngw_resource_defaults")


def _body_parent(resid):
    return dict(resource=dict(parent=dict(id=resid)))


@pytest.fixture
def parent_child(ngw_resource_group_sub):
    with transaction.manager:
        child = ResourceGroup(parent_id=ngw_resource_group_sub).persist()
    yield ngw_resource_group_sub, child.id


def test_trash(parent_child, ngw_webtest_app: WebTestApp):
    parent, res = parent_child
    rapi = ResourceAPI()
    sapi = ngw_webtest_app.with_url("/api/resource/search/")

    before = utcnow_naive()
    rapi.delete_request(res, query=dict(soft=True), status=200)
    after = utcnow_naive()
    ts = DBSession.query(Resource.deletion_date).filter_by(id=res).scalar()
    assert ts is not None and before < ts < after

    # Read / update / delete
    rapi.read_request(res, status=404)
    rapi.update_request(res, dict(resource=dict(display_name="nvm")), status=404)
    rapi.delete_request(res, query=dict(soft=True), status=404)

    # Collection
    resp = ngw_webtest_app.get("/api/resource/", query=dict(parent=parent))
    for item in resp.json:
        assert item["resource"]["id"] != res

    # Search
    for search in (dict(parent=parent), dict(root=parent)):
        resp = sapi.get(query=dict(breadcrumb=True, **search))
        assert res not in resp.json["breadcrumb"]
        for item in resp.json["items"]:
            assert item["resource"]["id"] != res

    # Create subresource
    with pytest.raises(NoResultFound):
        rapi.create_request("resource_group", _body_parent(res))

    # Move subresource
    child = rapi.create("resource_group", _body_parent(parent))
    with pytest.raises(NoResultFound):
        rapi.update_request(child, _body_parent(res))
