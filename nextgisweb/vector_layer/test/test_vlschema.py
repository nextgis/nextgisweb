from pathlib import Path

import pytest
import sqlalchemy as sa
from sqlalchemy.sql import alias, select

from nextgisweb.env.test import sql_compare
from nextgisweb.lib.saext import Geometry

from ..model import VectorLayer, VectorLayerField
from ..vlschema import SCHEMA, VLSchema

pytestmark = pytest.mark.usefixtures("ngw_resource_defaults")


class VLSchemaTest(VLSchema):
    def __init__(self, **kwargs):
        kwargs["tbl_uuid"] = None
        kwargs["geom_column_type"] = Geometry("POINTZ", 3857)
        kwargs["fields"] = {"i": ("i", sa.Integer), "t": ("t", sa.Text), "d": ("d", sa.Date)}
        kwargs["schema"] = None
        super().__init__(**kwargs)

    def _table_name(self, suffix=None):
        return f"{suffix}t" if suffix else "ct"


def sql_cmp(val, file):
    if isinstance(val, tuple) and isinstance(val[1], dict):
        val = [val[0]]
    if not hasattr(val, "__iter__"):
        val = [val]

    src = Path(__file__).parent / f"{file}.sql".lower()
    sql_compare(val, src)


@pytest.mark.parametrize("versioning", [False, True])
def test_ref_ddl(versioning):
    vls = VLSchemaTest(versioning=versioning)
    vs = f"v={str(versioning).lower()}"
    sql_cmp(vls.sql_create(), f"ref_ddl/create.{vs}")
    sql_cmp(vls.sql_drop(), f"ref_ddl/drop.{vs}")
    sql_cmp(vls.sql_add_fields(["i", "d"]), f"ref_ddl/add_fields.{vs}")

    if versioning:
        sql = vls.sql_versioning_enable()
        sql_cmp(sql, "ref_ddl/versioning_enable")
    else:
        sql = vls.sql_versioning_disable()
        sql_cmp(sql, "ref_ddl/versioning_disable")

        sql = vls.sql_convert_geom_column_type(Geometry("MULTIPOINT", 3857))
        sql_cmp(sql, "ref_ddl/convert_geom_column_type")

        sql_cmp(vls.sql_delete_fields(["i", "d"]), "ref_ddl/delete_fields")


@pytest.mark.parametrize("versioning", [False, True])
@pytest.mark.parametrize(
    "operation",
    [
        "insert",
        "update",
        "delete",
        "restore",
        "initfill",
        "query_pit",
        "query_changed_fids",
        "query_changes",
    ],
)
def test_ref_dml(versioning, operation):
    vls = VLSchemaTest(versioning=versioning)
    vs = f"v={versioning}"
    bpid = sa.bindparam("id")
    if operation == "insert":
        sql_cmp(vls.dml_insert(), f"ref_dml/insert.{vs}")
    elif operation == "update":
        for wg in (False, True):
            sql = vls.dml_update(id=bpid, with_geom=wg)
            sql_cmp(sql, f"ref_dml/update.{vs}.wg={wg}")
    elif operation == "delete":
        sql_cmp(vls.dml_delete(filter_by=dict(fid=bpid)), f"ref_dml/delete.{vs}")
    elif not versioning:
        return  # Skip rest, versioning specific
    elif operation == "restore":
        for wg in (False, True):
            sql = vls.dml_restore(with_geom=wg)
            sql_cmp(sql, f"ref_dml/restore.wg={wg}")
    elif operation == "initfill":
        sql_cmp(vls.dml_initfill(), "ref_dml/initfill")
    elif operation == "query_pit":
        sql_cmp(vls.query_pit(sa.bindparam("vid")), "ref_dml/query_pit")
    elif operation == "query_changed_fids":
        sql_cmp(vls.query_changed_fids(), "ref_dml/query_changed_fids")
    elif operation == "query_changes":
        sql_cmp(vls.query_changes(), "ref_dml/query_changes")


def vlfld(key):
    return VectorLayerField(keyname=key, datatype="STRING", display_name=key)


def test_aliased(ngw_txn):
    res = VectorLayer(geometry_type="POINT").persist()
    foo = vlfld("foo")
    bar = vlfld("bar")
    res.fields = [foo, bar]

    ctab = res.vlschema().ctab
    a = alias(ctab, "a")
    b = alias(ctab, "b")

    sql = str(select(a.fields["foo"].label("foo"), b.fields["bar"].label("bar")))
    assert sql.replace("\n", " ").replace("  ", " ") == (
        f"SELECT a.fld_{foo.fld_uuid} AS foo, b.fld_{bar.fld_uuid} AS bar "
        f"FROM {SCHEMA}.layer_{res.tbl_uuid} AS a, {SCHEMA}.layer_{res.tbl_uuid} AS b"
    )


@pytest.mark.parametrize("versioning", [False, True])
def test_create(versioning, ngw_txn):
    res = VectorLayer(geometry_type="POINT").persist()
    res.fversioning_configure(enabled=versioning)

    res.fields.append(vlfld("foo"))
    feature_query(res)


@pytest.mark.parametrize("versioning", [False, True])
def test_add_field(versioning, ngw_txn):
    res = VectorLayer(geometry_type="POINT").persist()
    res.fversioning_configure(enabled=versioning)

    res.fields.append(vlfld("foo"))
    feature_query(res)

    res.fields.append(vlfld("bar"))
    feature_query(res)


def test_delete_field(ngw_txn):
    res = VectorLayer(geometry_type="POINT").persist()
    res.fields.append(vlfld("foo"))
    res.fields.append(vlfld("bar"))
    feature_query(res)

    res.fields.remove(res.fields[-1])
    feature_query(res)


def test_replace_field(ngw_txn):
    res = VectorLayer(geometry_type="POINT").persist()
    res.fields.append(vlfld("foo"))
    feature_query(res)

    res.fields.remove(res.fields[0])
    res.fields.append(vlfld("bar"))
    feature_query(res)


def feature_query(res):
    result = res.feature_query()()
    for row in result:
        pass
