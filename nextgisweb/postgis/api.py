from typing import Annotated, List, Union

from msgspec import UNSET, Meta, Struct, UnsetType
from msgspec.structs import asdict
from sqlalchemy import inspect
from sqlalchemy.exc import NoResultFound, NoSuchTableError, SQLAlchemyError

from nextgisweb.env import gettext, gettextf
from nextgisweb.lib.apitype import AsJSON

from nextgisweb.core.exception import ValidationError
from nextgisweb.resource import ConnectionScope, ResourceFactory, ResourceScope

from .diagnostics import Checker, StatusEnum
from .exception import ExternalDatabaseError
from .model import PostgisConnection, PostgisLayer
from .util import coltype_as_str


class SchemaObject(Struct, kw_only=True):
    schema: str
    views: List[str]
    tables: List[str]


def inspect_connection(request) -> AsJSON[List[SchemaObject]]:
    request.resource_permission(ConnectionScope.connect)

    connection = request.context
    engine = connection.get_engine()
    try:
        inspector = inspect(engine)
    except SQLAlchemyError as exc:
        raise ExternalDatabaseError(message="Failed to inspect database.", sa_error=exc)

    skip = {
        "spatial_ref_sys",
        "geometry_columns",
        "geography_columns",
        "raster_columns",
        "raster_overviews",
    }

    result = []
    for schema_name in inspector.get_schema_names():
        if schema_name == "information_schema":
            continue
        result.append(
            SchemaObject(
                schema=schema_name,
                views=[s for s in inspector.get_view_names(schema=schema_name) if s not in skip],
                tables=[s for s in inspector.get_table_names(schema=schema_name) if s not in skip],
            )
        )

    return result


class ColumnObject(Struct, kw_only=True):
    name: str
    type: str


def inspect_table(request) -> AsJSON[List[ColumnObject]]:
    request.resource_permission(ConnectionScope.connect)

    connection = request.context
    engine = connection.get_engine()
    try:
        inspector = inspect(engine)
    except SQLAlchemyError as exc:
        raise ExternalDatabaseError(message="Failed to inspect database.", sa_error=exc)

    table_name = request.matchdict["table_name"]
    schema = request.GET.get("schema", "public")

    result = []
    try:
        for column in inspector.get_columns(table_name, schema):
            result.append(ColumnObject(name=column["name"], type=coltype_as_str(column["type"])))
    except NoSuchTableError:
        raise ValidationError(
            gettext("Table (%s) not found in schema (%s)." % (table_name, schema))
        )

    return result


class ConnectionObject(Struct):
    id: Union[Annotated[int, Meta(ge=0)], UnsetType] = UNSET
    hostname: Union[str, UnsetType] = UNSET
    port: Union[int, UnsetType] = UNSET
    database: Union[str, UnsetType] = UNSET
    username: Union[str, UnsetType] = UNSET
    password: Union[str, UnsetType] = UNSET


class FieldObject(Struct):
    keyname: str
    datatype: str
    column_name: str


class LayerObject(Struct):
    id: Union[Annotated[int, Meta(ge=0)], UnsetType] = UNSET
    schema: Union[str, UnsetType] = UNSET
    table: Union[str, UnsetType] = UNSET
    column_id: Union[str, UnsetType] = UNSET
    column_geom: Union[str, UnsetType] = UNSET
    geometry_type: Union[str, UnsetType] = UNSET
    geometry_srid: Union[int, UnsetType] = UNSET
    fields: Union[List[FieldObject], UnsetType] = UNSET


class CheckBody(Struct, kw_only=True):
    connection: Union[ConnectionObject, None] = None
    layer: Union[LayerObject, None] = None


class CheckMessage(Struct, kw_only=True):
    status: Union[StatusEnum, None] = None
    text: Union[str, UnsetType] = UNSET


class CheckResult(Struct, kw_only=True):
    status: StatusEnum
    group: str
    title: Union[str, UnsetType] = UNSET
    messages: List[CheckMessage]


class CheckResponse(Struct, kw_only=True):
    status: Union[StatusEnum, None]
    checks: List[CheckResult]


def diagnostics(request, *, body: CheckBody) -> CheckResponse:
    # Don't allow this for guest due to security reasons.
    request.require_authenticated()

    connection = None if body.connection is None else asdict(body.connection)
    layer = None if body.layer is None else asdict(body.layer)

    if layer is not None:
        if lid := layer.get("id"):
            try:
                res = PostgisLayer.filter_by(id=lid).one()
            except NoResultFound:
                raise ValidationError(message=gettextf("PostGIS layer {} not found!")(lid))

            # Same permission as for reading layer parameters.
            request.resource_permission(ResourceScope.read, res)
            layer = {
                k: getattr(res, k)
                for k in (
                    "schema",
                    "table",
                    "column_id",
                    "column_geom",
                    "geometry_type",
                    "geometry_srid",
                    "fields",
                )
            }

            if connection is None:
                connection = dict(id=res.connection_id)

    if cid := connection.get("id"):
        try:
            res = PostgisConnection.filter_by(id=cid).one()
        except NoResultFound:
            raise ValidationError(message=gettextf("PostGIS connection {} not found!")(cid))

        request.resource_permission(ConnectionScope.connect, res)
        connection = {
            k: getattr(res, k)
            for k in ("hostname", "port", "database", "username", "password", "sslmode")
        }

    checker = Checker(connection=connection, layer=layer)

    checks = list()
    result = CheckResponse(
        status=checker.status.value if checker.status else None,
        checks=checks,
    )

    tr = request.localizer.translate
    for ck in checker.checks:
        messages = list()
        ck_result = CheckResult(status=ck.status, group=ck.group, messages=messages)
        if title := getattr(ck, "title", None):
            ck_result.title = tr(title)

        for msg in ck.messages:
            msg_result = CheckMessage(status=msg.get("status"))
            if text := msg.get("text"):
                msg_result.text = tr(text)
            messages.append(msg_result)

        checks.append(ck_result)

    return result


def setup_pyramid(comp, config):
    postgis_connection_factory = ResourceFactory(context=PostgisConnection)

    config.add_route(
        "postgis.connection.inspect",
        "/api/resource/{id}/inspect/",
        factory=postgis_connection_factory,
        get=inspect_connection,
    )

    config.add_route(
        "postgis.connection.inspect.table",
        "/api/resource/{id}/inspect/{table_name:str}/",
        factory=postgis_connection_factory,
        get=inspect_table,
    )

    config.add_route(
        "postgis.diagnostics",
        "/api/component/postgis/check",
        post=diagnostics,
    )
