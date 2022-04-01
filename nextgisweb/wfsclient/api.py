from ..resource import ConnectionScope, resource_factory

from .model import WFSConnection


def inspect_connection(resource, request):
    request.resource_permission(ConnectionScope.connect)

    capabilities = resource.get_capabilities()

    return capabilities['layers']


def inspect_layer(resource, request):
    request.resource_permission(ConnectionScope.connect)

    layer_name = request.matchdict['layer']
    fields = resource.get_fields(layer_name)

    return fields


def setup_pyramid(comp, config):
    config.add_route(
        'wfsclient.connection.inspect', '/api/resource/{id}/wfs_connection/inspect/',
        factory=resource_factory) \
        .add_view(inspect_connection, context=WFSConnection, request_method='GET', renderer='json')

    config.add_route(
        'wfsclient.connection.inspect.layer', '/api/resource/{id}/wfs_connection/inspect/{layer}/',
        factory=resource_factory) \
        .add_view(inspect_layer, context=WFSConnection, request_method='GET', renderer='json')
