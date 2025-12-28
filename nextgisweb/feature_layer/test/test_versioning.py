from pathlib import Path
from secrets import token_hex

import pytest
import sqlalchemy as sa
import sqlalchemy.orm as orm

from nextgisweb.env.test import sql_compare

from ..versioning.extension import ExtensionQueries, FVersioningExtensionMixin

Base = orm.declarative_base()
registry = dict()


class Simple(Base, FVersioningExtensionMixin):
    __tablename__ = "simple"

    fversioning_metadata_version = 1
    fversioning_extension = "simple"
    fversioning_columns = ("value",)
    fversioning_registry = registry

    resource_id = sa.Column(sa.Integer, primary_key=True)
    feature_id = sa.Column(sa.Integer, primary_key=True)
    value = sa.Column(sa.Unicode, nullable=True)


class Complex(Base, FVersioningExtensionMixin):
    __tablename__ = "complex"

    fversioning_metadata_version = 1
    fversioning_extension = "complex"
    fversioning_columns = ("column_a", "column_b")
    fversioning_registry = registry

    id = sa.Column(sa.Integer, primary_key=True)
    resource_id = sa.Column(sa.Integer, nullable=False)
    feature_id = sa.Column(sa.Integer, nullable=False)
    column_a = sa.Column(sa.Unicode, nullable=True)
    column_b = sa.Column(sa.Unicode, nullable=True)


@pytest.fixture(scope="module", autouse=True)
def configure_mappers():
    orm.configure_mappers()


@pytest.mark.parametrize("cls", [Simple, Complex])
def test_ref_create_table(cls):
    sql = list()
    for t in (cls.__table__, cls.fversioning_etab, cls.fversioning_htab):
        sql.append(sa.schema.CreateTable(t))
        for idx in t.indexes:
            sql.append(sa.schema.CreateIndex(idx))

    ref_file = Path(__file__).parent / f"ref_sql/create_table.{cls.__tablename__}.sql"
    sql_compare(sql, ref_file)


@pytest.mark.parametrize("cls", [Simple, Complex])
@pytest.mark.parametrize(
    "name",
    [
        name
        for name in dir(ExtensionQueries)
        if (prop := getattr(ExtensionQueries, name, None)) is not None
        and getattr(prop, "_cached_query", False)
    ],
)
def test_ref_sql_queries(name, cls):
    query = getattr(cls.fversioning_queries, name)
    ref_file = Path(__file__).parent / f"ref_sql/{name}.{cls.__tablename__}.sql"
    sql_compare([query] if not isinstance(query, (tuple, list)) else query, ref_file)


def versioning_params():
    for setting in (True, False):
        for input_ in (None, True, False):
            expected = input_ if input_ is not None else setting
            yield setting, input_, expected


@pytest.mark.parametrize("setting, input_, expected", versioning_params())
def test_versioning_default(
    setting,
    input_,
    expected,
    ngw_fversioning_default,
    ngw_resource_group,
    ngw_auth_administrator,
    ngw_webtest_app,
):
    data = dict(
        resource=dict(
            cls="vector_layer",
            parent=dict(id=ngw_resource_group),
            display_name=token_hex(8),
        ),
        vector_layer=dict(geometry_type="POINT", srs=dict(id=3857)),
    )
    if input_ is not None:
        data["feature_layer"] = dict(versioning=dict(enabled=input_))

    with ngw_fversioning_default(setting):
        resp = ngw_webtest_app.post_json("/api/resource/", data, status=201)

    resource_id = resp.json["id"]

    resp = ngw_webtest_app.get(f"/api/resource/{resource_id}", status=200)
    versioning = resp.json["feature_layer"]["versioning"]

    assert versioning["enabled"] is expected
