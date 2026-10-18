from contextlib import contextmanager
from unittest.mock import patch

import pytest
import sqlalchemy as sa
import transaction
from pyramid.testing import DummyRequest

from nextgisweb.env import DBSession

from nextgisweb.auth import User
from nextgisweb.core.exception import UserException
from nextgisweb.feature_description import FeatureDescription
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
            DROP TABLE IF EXISTS test_types;
            CREATE TABLE test_types
            (
                id bigserial PRIMARY KEY,
                geom geometry(Point,3857),
                fld_varchar character varying, fld_character character(50), fld_text text, fld_uuid uuid,
                fld_int integer, fld_bigint bigint,
                fld_double double precision, fld_numeric numeric,
                fld_date date, fld_time_without_tz time without time zone, fld_ts_without_tz timestamp without time zone,
                fld_boolean boolean
            );

            INSERT INTO test_types (
                geom,
                fld_varchar, fld_character, fld_text, fld_uuid,
                fld_int, fld_bigint,
                fld_double, fld_numeric,
                fld_date, fld_time_without_tz, fld_ts_without_tz,
                fld_boolean
            )
            VALUES (
                ST_SetSRID('POINT (0 0)'::geometry, 3857),
                'varchar', 'character', 'text', md5(random()::text)::uuid,
                -1, 9223372036854775807,
                1.1, 1.2,
                now(), now(), now(),
                true
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
        json={"layer": {"id": layer.id}},
    )
    assert StatusEnum(resp.json["status"]) is StatusEnum.SUCCESS


@pytest.fixture
def db_tx_ctx(engine):
    with db_ctx(
        engine,
        """
            DROP TABLE IF EXISTS test_tx;
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


@pytest.fixture
def postgis_layer(creds, db_tx_ctx):
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
    yield layer.id


def test_postgis_tx(postgis_layer, ngw_webtest_app: WebTestApp):
    resp = ngw_webtest_app.post(
        "/api/component/postgis/check",
        json={"layer": {"id": postgis_layer}},
    )
    assert StatusEnum(resp.json["status"]) is StatusEnum.SUCCESS

    fapi = ngw_webtest_app.with_url(f"/api/resource/{postgis_layer}/feature/")

    data = [{"fields": {"fld_sometime_fail": n}} for n in (4, 8, 15)]
    resp = fapi.patch(json=data, status=200)
    assert len(resp.json) == 3

    data = [{"fields": {"fld_sometime_fail": n}} for n in (16, 23, 42)]
    resp = fapi.patch(json=data, status="*")
    assert resp.status_code >= 500

    resp = fapi.get(status=200)
    assert len(resp.json) == 3


@pytest.mark.parametrize("ok", (True, False))
def test_postgis_tx_fail(ok, postgis_layer, ngw_webtest_app: WebTestApp, ngw_env):
    fapi = ngw_webtest_app.with_url(f"/api/resource/{postgis_layer}/feature/")

    data = {"extensions": {"description": "description"}}
    with (
        patch.object(
            PostgisLayer,
            "_connection_context",
            autospec=True,
            side_effect=PostgisLayer._connection_context,
        ) as mock_ctx,
        patch(
            "nextgisweb.feature_layer.api.FeatureChangeResult.version_from",
            side_effect=UserException() if not ok else None,
        ),
    ):
        fapi.post(json=data, status=200 if ok else 500)
        mock_ctx.assert_called_once()

    expected = 1 if ok else 0

    resp = fapi.get(status=200)
    assert len(resp.json) == expected

    count = (
        DBSession.query(sa.func.count(FeatureDescription.feature_id))
        .filter(FeatureDescription.resource_id == postgis_layer)
        .scalar()
    )
    assert count == expected


def read_setting(layer, name):
    with layer.connect() as conn:
        stmt = sa.text("SELECT current_setting(:name, true)")
        return conn.execute(stmt, {"name": name}, update=False).scalar()


@pytest.fixture(scope="module")
def context_user():
    with transaction.manager:
        return User(
            keyname="user_context_test",
            display_name="User context test",
            oauth_subject="user_context_sub",
        ).persist()


@pytest.fixture
def context_layer(creds, db_tx_ctx):
    def create(*, user_context):
        with transaction.manager:
            connection = PostgisConnection(user_context=user_context, **creds).persist()
            layer = PostgisLayer(
                connection=connection,
                schema="public",
                table="test_tx",
                column_id="id",
                column_geom="geom",
            ).persist()
            layer.setup()
        return PostgisLayer.filter_by(id=layer.id).one()

    return create


def test_user_context_enabled(context_layer, context_user):
    layer = context_layer(user_context=True)

    with layer.feature_transaction(DummyRequest(user=context_user)):
        assert read_setting(layer, "nextgisweb.user_id") == str(context_user.id)
        assert read_setting(layer, "nextgisweb.user_keyname") == "user_context_test"
        assert read_setting(layer, "nextgisweb.user_display_name") == "User context test"
        assert read_setting(layer, "nextgisweb.user_oauth_subject") == "user_context_sub"

    # A custom GUC cannot be removed from a session: after the
    # transaction that set it ends (even via SET LOCAL + ROLLBACK) it
    # reads back as '' instead of NULL. Known and dismissed upstream:
    # https://www.postgresql.org/message-id/flat/56842412.5000005@joeconway.com
    assert read_setting(layer, "nextgisweb.user_id") in (None, "")


def test_user_context_disabled(context_layer, context_user):
    layer = context_layer(user_context=False)

    with layer.feature_transaction(DummyRequest(user=context_user)):
        assert read_setting(layer, "nextgisweb.user_id") in (None, "")
        assert read_setting(layer, "nextgisweb.user_keyname") in (None, "")
        assert read_setting(layer, "nextgisweb.user_display_name") in (None, "")
        assert read_setting(layer, "nextgisweb.user_oauth_subject") in (None, "")
