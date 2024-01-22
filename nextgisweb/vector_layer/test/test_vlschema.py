import pytest
from sqlalchemy.sql import alias, select

from ..model import VectorLayer, VectorLayerField
from ..vlschema import SCHEMA

pytestmark = pytest.mark.usefixtures("ngw_resource_defaults")


def test_aliased(ngw_txn):
    res = VectorLayer(geometry_type="POINT").persist()
    foo = VectorLayerField(keyname="foo", datatype="STRING", display_name="foo")
    bar = VectorLayerField(keyname="bar", datatype="STRING", display_name="bar")
    res.fields = [foo, bar]

    ctab = res.vlschema().ctab
    a = alias(ctab, "a")
    b = alias(ctab, "b")

    sql = str(select(a.fields["foo"].label("foo"), b.fields["bar"].label("bar")))
    assert sql.replace("\n", " ").replace("  ", " ") == (
        f"SELECT a.fld_{foo.fld_uuid} AS foo, b.fld_{bar.fld_uuid} AS bar "
        f"FROM {SCHEMA}.layer_{res.tbl_uuid} AS a, {SCHEMA}.layer_{res.tbl_uuid} AS b"
    )


def test_create(ngw_txn):
    res = VectorLayer(geometry_type="POINT").persist()
    res.fields.append(VectorLayerField(keyname="foo", datatype="STRING", display_name="foo"))
    feature_query(res)


def test_add_field(ngw_txn):
    res = VectorLayer(geometry_type="POINT").persist()
    res.fields.append(VectorLayerField(keyname="foo", datatype="STRING", display_name="foo"))
    feature_query(res)

    res.fields.append(VectorLayerField(keyname="bar", datatype="STRING", display_name="bar"))
    feature_query(res)


def test_delete_field(ngw_txn):
    res = VectorLayer(geometry_type="POINT").persist()
    res.fields.append(VectorLayerField(keyname="foo", datatype="STRING", display_name="foo"))
    res.fields.append(VectorLayerField(keyname="bar", datatype="STRING", display_name="bar"))
    feature_query(res)

    res.fields.remove(res.fields[-1])
    feature_query(res)


def test_replace_field(ngw_txn):
    res = VectorLayer(geometry_type="POINT").persist()
    res.fields.append(VectorLayerField(keyname="foo", datatype="STRING", display_name="foo"))
    feature_query(res)

    res.fields.remove(res.fields[0])
    res.fields.append(VectorLayerField(keyname="bar", datatype="STRING", display_name="bar"))
    feature_query(res)


def feature_query(res):
    result = res.feature_query()()
    for row in result:
        pass
