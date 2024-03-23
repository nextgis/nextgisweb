import pytest
from sqlalchemy.exc import IntegrityError

from nextgisweb.env import DBSession

from nextgisweb.auth import User

from .. import Resource, ResourceGroup
from ..composite import CompositeSerializer


def test_root_serialize(ngw_txn):
    CompositeRead = CompositeSerializer.types().read

    resource = Resource.filter_by(id=0).one()
    srlzr = CompositeSerializer(user=resource.owner_user)

    result = srlzr.serialize(resource, CompositeRead)
    assert result.resource["cls"] == "resource_group"  # type: ignore


def test_same_display_name(ngw_txn, ngw_resource_group):
    margs = dict(
        parent_id=ngw_resource_group,
        display_name="display name",
        owner_user=User.by_keyname("administrator"),
    )

    with pytest.raises(IntegrityError, match='"resource_parent_id_display_name_key"'):
        ResourceGroup(**margs).persist()
        ResourceGroup(**margs).persist()
        DBSession.flush()
