from geoalchemy2.shape import to_shape
from pyramid.httpexceptions import HTTPBadRequest, HTTPNotFound

from nextgisweb.env import DBSession, env

from nextgisweb.layer import IBboxLayer
from nextgisweb.pyramid import JSONType
from nextgisweb.resource import DataScope, resource_factory

from .model import (
    WM_SETTINGS,
    WebMap,
    WebMapAnnotation,
    WebMapScope,
)


def annotation_to_dict(obj, request, with_user_info=False):
    result = dict()

    keys = ('id', 'description', 'style', 'geom', 'public')
    if with_user_info and (obj.public is False):
        keys = keys + ('user_id', 'user',)

    user_id = request.user.id
    result['own'] = user_id == obj.user_id

    for k in keys:
        v = getattr(obj, k)
        if k == 'geom':
            v = to_shape(v).wkt
        if k == 'user' and (v is not None):
            v = v.display_name
        if v is not None:
            result[k] = v
    return result


def annotation_from_dict(obj, data):
    for k in ('description', 'style', 'geom', 'public'):
        if k in data:
            v = data[k]
            if k == 'geom':
                v = 'SRID=3857;' + v
            setattr(obj, k, v)


def check_annotation_enabled(request):
    if not request.env.webmap.options['annotation']:
        raise HTTPNotFound()


def annotation_cget(resource, request) -> JSONType:
    check_annotation_enabled(request)
    request.resource_permission(WebMapScope.annotation_read)

    if resource.has_permission(WebMapScope.annotation_manage, request.user):
        return [annotation_to_dict(a, request, with_user_info=True) for a in resource.annotations]

    return [annotation_to_dict(a, request) for a in resource.annotations
            if a.public or (not a.public and a.user_id == request.user.id)]


def annotation_cpost(resource, request) -> JSONType:
    check_annotation_enabled(request)
    request.resource_permission(WebMapScope.annotation_write)
    obj = WebMapAnnotation()
    annotation_from_dict(obj, request.json_body)
    if not obj.public:
        obj.user_id = request.user.id
    resource.annotations.append(obj)
    DBSession.flush()
    return dict(id=obj.id)


def annotation_iget(resource, request) -> JSONType:
    check_annotation_enabled(request)
    request.resource_permission(WebMapScope.annotation_read)
    obj = WebMapAnnotation.filter_by(webmap_id=resource.id, id=int(
        request.matchdict['annotation_id'])).one()
    with_user_info = resource.has_permission(WebMapScope.annotation_manage, request.user)
    return annotation_to_dict(obj, request, with_user_info)


def annotation_iput(resource, request) -> JSONType:
    check_annotation_enabled(request)
    request.resource_permission(WebMapScope.annotation_write)
    obj = WebMapAnnotation.filter_by(webmap_id=resource.id, id=int(
        request.matchdict['annotation_id'])).one()
    annotation_from_dict(obj, request.json_body)
    return dict(id=obj.id)


def annotation_idelete(resource, request) -> JSONType:
    check_annotation_enabled(request)
    request.resource_permission(WebMapScope.annotation_write)
    obj = WebMapAnnotation.filter_by(webmap_id=resource.id, id=int(
        request.matchdict['annotation_id'])).one()
    DBSession.delete(obj)
    return None


def add_extent(e1, e2):
    def is_valid(extent):
        if not extent:
            return False
        for k, v in extent.items():
            if v is None:
                return False
        return True

    e1_valid = is_valid(e1)
    e2_valid = is_valid(e2)
    if (not e1_valid) or (not e2_valid):
        return (e2 if e2_valid else None) or \
            (e1 if e1_valid else None)

    return dict(
        minLon=min(e1['minLon'], e2['minLon']),
        maxLon=max(e1['maxLon'], e2['maxLon']),
        minLat=min(e1['minLat'], e2['minLat']),
        maxLat=max(e1['maxLat'], e2['maxLat']),
    )


def get_webmap_extent(resource, request) -> JSONType:
    request.resource_permission(WebMapScope.display)

    def traverse(item, extent):
        if item.item_type == 'layer':
            if res := item.style.lookup_interface(IBboxLayer):
                if not res.has_permission(DataScope.read, request.user):
                    return extent
                extent = add_extent(extent, res.extent)
        elif item.item_type in ('root', 'group'):
            for i in item.children:
                extent = traverse(i, extent)
        return extent

    return traverse(resource.root_item, None)


def settings_get(request) -> JSONType:
    result = dict()
    for k, default in WM_SETTINGS.items():
        try:
            v = env.core.settings_get('webmap', k)
            if v is not None:
                result[k] = v
        except KeyError:
            result[k] = default

    return result


def settings_put(request) -> JSONType:
    request.require_administrator()

    body = request.json_body
    for k, v in body.items():
        if k in WM_SETTINGS.keys():
            env.core.settings_set('webmap', k, v)
        else:
            raise HTTPBadRequest(explanation="Invalid key '%s'" % k)


def setup_pyramid(comp, config):
    setup_annotations(config)

    comp.settings_view = settings_get

    config.add_route('webmap.settings', '/api/component/webmap/settings') \
        .add_view(settings_get, request_method='GET') \
        .add_view(settings_put, request_method='PUT')

    config.add_route(
        'webmap.extent',
        r'/api/resource/{id:\d+}/webmap/extent',
        factory=resource_factory
    ).add_view(get_webmap_extent, context=WebMap, request_method='GET')


def setup_annotations(config):
    config.add_route(
        'webmap.annotation.collection', r'/api/resource/{id:\d+}/annotation/',
        factory=resource_factory
    ) \
        .add_view(annotation_cget, context=WebMap, request_method='GET') \
        .add_view(annotation_cpost, context=WebMap, request_method='POST')

    config.add_route(
        'webmap.annotation.item', r'/api/resource/{id:\d+}/annotation/{annotation_id:\d+}',
        factory=resource_factory
    ) \
        .add_view(annotation_iget, context=WebMap, request_method='GET') \
        .add_view(annotation_iput, context=WebMap, request_method='PUT') \
        .add_view(annotation_idelete, context=WebMap, request_method='DELETE')
