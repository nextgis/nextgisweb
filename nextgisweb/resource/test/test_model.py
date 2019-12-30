# -*- coding: utf-8 -*-
from __future__ import absolute_import, print_function, unicode_literals

import pytest
import json
from sqlalchemy.exc import IntegrityError

from nextgisweb.models import DBSession
from nextgisweb import geojson
from nextgisweb.resource import Resource, ResourceGroup
from nextgisweb.resource.serialize import CompositeSerializer
from nextgisweb.auth import User


def test_root_serialize(txn):
    resource = Resource.filter_by(id=0).one()
    srlzr = CompositeSerializer(resource, resource.owner_user)
    srlzr.serialize()

    data = json.loads(json.dumps(srlzr.data, cls=geojson.Encoder))

    assert 'resource' in data
    assert data['resource']['cls'] == 'resource_group'


def test_same_display_name(txn):
    margs = dict(
        parent_id=0, display_name='display name',
        owner_user=User.by_keyname('administrator'))

    with pytest.raises(IntegrityError, match='"resource_parent_id_display_name_key"'):
        ResourceGroup(**margs).persist()
        ResourceGroup(**margs).persist()
        DBSession.flush()
