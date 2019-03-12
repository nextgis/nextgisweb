# -*- coding: utf-8 -*-
import json

from sqlalchemy import inspect
from sqlalchemy.exc import NoSuchTableError
from pyramid.response import Response

from .model import PostgisConnection
from ..resource import resource_factory, ConnectionScope
from ..resource.exception import ValidationError

from .util import _


def inspect_connection(request):
    request.resource_permission(ConnectionScope.connect)

    connection = request.context
    inspector = inspect(connection.get_engine())

    result = []
    for schema_name in inspector.get_schema_names():
        if schema_name != 'information_schema':
            result.append(dict(
                schema=schema_name,
                views=inspector.get_view_names(schema=schema_name),
                tables=inspector.get_table_names(schema=schema_name)))

    return Response(json.dumps(result), content_type=b'application/json')


def inspect_table(request):
    request.resource_permission(ConnectionScope.connect)

    connection = request.context
    inspector = inspect(connection.get_engine())

    table_name = request.matchdict['table_name']
    schema = request.GET.get('schema', 'public')

    result = []
    try:
        for column in inspector.get_columns(table_name, schema):
            result.append(dict(
                name=column.get('name'),
                type='%r' % column.get('type')))
    except NoSuchTableError:
        raise ValidationError(_("Table (%s) not found in schema (%s)." % (table_name, schema)))

    return Response(json.dumps(result), content_type=b'application/json')


def setup_pyramid(comp, config):
    config.add_route(
        'postgis.connection.inspect', '/api/resource/{id}/inspect/',
        factory=resource_factory) \
        .add_view(inspect_connection, context=PostgisConnection, request_method='GET')

    config.add_route(
        'postgis.connection.inspect.table', '/api/resource/{id}/inspect/{table_name}/',
        factory=resource_factory) \
        .add_view(inspect_table, context=PostgisConnection, request_method='GET')
