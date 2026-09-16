import json

import pytest
import transaction

from nextgisweb.env import DBSession

from nextgisweb.auth.model import User
from nextgisweb.feature_layer.filter import FilterParser
from nextgisweb.lookup_table import LookupTable
from nextgisweb.resource import ResourceACLRule, ResourceGroup
from nextgisweb.vector_layer import VectorLayer

pytestmark = pytest.mark.usefixtures("ngw_resource_defaults", "ngw_auth_administrator")

LOOKUP_GEOJSON = {
    "type": "FeatureCollection",
    "crs": {"type": "name", "properties": {"name": "urn:ogc:def:crs:EPSG::3857"}},
    "features": [
        {
            "type": "Feature",
            "properties": {"name": "Alice", "city": "1"},
            "geometry": {"type": "Point", "coordinates": [0, 0]},
        },
        {
            "type": "Feature",
            "properties": {"name": "Bob", "city": "2"},
            "geometry": {"type": "Point", "coordinates": [1, 1]},
        },
        {
            "type": "Feature",
            "properties": {"name": "Charlie", "city": "3"},
            "geometry": {"type": "Point", "coordinates": [2, 2]},
        },
    ],
}


@pytest.fixture(scope="module")
def lookup_dataset():
    with transaction.manager:
        lookup = LookupTable(
            value=[("1", "Moscow"), ("2", "Saint Petersburg"), ("3", "NYC")]
        ).persist()

        layer = VectorLayer().persist().from_ogr(json.dumps(LOOKUP_GEOJSON))
        for fld in layer.fields:
            if fld.keyname == "city":
                fld.lookup_table_id = lookup.id

        DBSession.flush()
        layer_id, lookup_id = layer.id, lookup.id

    return layer_id, lookup_id


@pytest.fixture(scope="module")
def plain_user():
    with transaction.manager:
        return User.test_instance().persist()


def load_layer(layer_id):
    return VectorLayer.filter_by(id=layer_id).one()


def fetch_filtered_ids(resource, expression, *, user):
    program = FilterParser.from_resource(resource, user=user).parse(expression)
    query = resource.feature_query()
    query.set_filter_program(program)
    return [feature.id for feature in query()]


def test_lookup_label_match_admin(lookup_dataset):
    layer_id, _ = lookup_dataset
    layer = load_layer(layer_id)

    admin = User.filter_by(keyname="administrator").one()

    assert fetch_filtered_ids(layer, ["all", ["text_search", "moscow"]], user=admin) == [1]
    assert fetch_filtered_ids(layer, ["all", ["text_search", "saint"]], user=admin) == [2]
    assert fetch_filtered_ids(layer, ["all", ["text_search", "NYC"]], user=admin) == [3]


def test_lookup_label_match_case_sensitive(lookup_dataset):
    layer_id, _ = lookup_dataset
    layer = load_layer(layer_id)

    admin = User.filter_by(keyname="administrator").one()

    expr = ["all", ["text_search", "Moscow", {"case_sensitive": True}]]
    assert fetch_filtered_ids(layer, expr, user=admin) == [1]

    expr = ["all", ["text_search", "moscow", {"case_sensitive": True}]]
    assert fetch_filtered_ids(layer, expr, user=admin) == []


def test_lookup_no_read_permission(lookup_dataset, plain_user):
    layer_id, _ = lookup_dataset
    layer = load_layer(layer_id)

    assert fetch_filtered_ids(layer, ["all", ["text_search", "moscow"]], user=plain_user) == []


def test_lookup_read_granted(lookup_dataset):
    layer_id, lookup_id = lookup_dataset

    with transaction.manager:
        user = User.test_instance().persist()

        lookup = LookupTable.filter_by(id=lookup_id).one()
        for res in (ResourceGroup.filter_by(id=0).one(), lookup.parent, lookup):
            res.acl.append(
                ResourceACLRule(
                    action="allow",
                    principal=user,
                    identity="",
                    scope="resource",
                    permission="read",
                    propagate=False,
                )
            )

    layer = load_layer(layer_id)
    assert fetch_filtered_ids(layer, ["all", ["text_search", "moscow"]], user=user) == [1]
