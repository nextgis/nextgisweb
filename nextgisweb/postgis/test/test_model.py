from contextlib import contextmanager

import pytest
import sqlalchemy as sa
import transaction

from nextgisweb.env import DBSession

from nextgisweb.pyramid.test import WebTestApp

from .. import PostgisConnection, PostgisLayer
from ..diagnostics import StatusEnum

pytestmark = pytest.mark.usefixtures("ngw_resource_defaults", "ngw_auth_administrator")


@contextmanager
def db_ctx(engine, sql_prepare, sql_cleanup):
    with engine.connect() as conn:
        with conn.begin():
            conn.execute(sa.text(sql_prepare))
        try:
            yield
        finally:
            with conn.begin():
                conn.execute(sa.text(sql_cleanup))


@pytest.fixture
def types_ctx(engine):
    with db_ctx(
        engine,
        # fmt: off
        """
            CREATE TABLE test_types
            (
                id bigserial PRIMARY KEY,
                geom geometry(Point,3857),
                fld_varchar character varying, fld_character character(50), fld_text text, fld_uuid uuid,
                fld_int integer, fld_bigint bigint,
                fld_double double precision, fld_numeric numeric,
                fld_date date, fld_time_without_tz time without time zone, fld_ts_without_tz timestamp without time zone
            );

            INSERT INTO test_types (
                geom,
                fld_varchar, fld_character, fld_text, fld_uuid,
                fld_int, fld_bigint,
                fld_double, fld_numeric,
                fld_date, fld_time_without_tz, fld_ts_without_tz
            )
            VALUES (
                ST_SetSRID('POINT (0 0)'::geometry, 3857),
                'varchar', 'character', 'text', md5(random()::text)::uuid,
                -1, 9223372036854775807,
                1.1, 1.2,
                now(), now(), now()
            );
        """,
        # fmt: on
        "DROP TABLE test_types;",
    ):
        yield


def test_types(creds, types_ctx, ngw_webtest_app: WebTestApp):
    with transaction.manager:
        connection = PostgisConnection(**creds).persist()

        layer = PostgisLayer(
            connection=connection,
            schema="public",
            table="test_types",
            column_id="id",
            column_geom="geom",
        ).persist()

        layer.setup()

        DBSession.flush()

    resp = ngw_webtest_app.post(
        "/api/component/postgis/check",
        json=dict(layer=dict(id=layer.id)),
    )
    assert StatusEnum(resp.json["status"]) is StatusEnum.SUCCESS


@pytest.fixture
def db_tx_ctx(engine):
    with db_ctx(
        engine,
        """
            CREATE TABLE test_tx
            (
                id bigserial PRIMARY KEY,
                geom geometry(Point,3857),
                fld_sometime_fail integer CHECK (fld_sometime_fail <> 42)
            );
        """,
        "DROP TABLE test_tx;",
    ):
        yield


def test_db_tx(creds, db_tx_ctx, ngw_webtest_app: WebTestApp):
    with transaction.manager:
        connection = PostgisConnection(**creds).persist()

        layer = PostgisLayer(
            connection=connection,
            schema="public",
            table="test_tx",
            column_id="id",
            column_geom="geom",
        ).persist()

        layer.setup()

    resp = ngw_webtest_app.post(
        "/api/component/postgis/check",
        json=dict(layer=dict(id=layer.id)),
    )
    assert StatusEnum(resp.json["status"]) is StatusEnum.SUCCESS

    fapi = ngw_webtest_app.with_url(f"/api/resource/{layer.id}/feature/")

    data = [dict(fields=dict(fld_sometime_fail=n)) for n in (4, 8, 15)]
    resp = fapi.patch(json=data, status=200)
    assert len(resp.json) == 3

    data = [dict(fields=dict(fld_sometime_fail=n)) for n in (16, 23, 42)]
    resp = fapi.patch(json=data, status="*")
    assert resp.status_code >= 500

    resp = fapi.get(status=200)
    assert len(resp.json) == 3
