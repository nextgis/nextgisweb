# -*- coding: utf-8 -*-
import re
import json

from shapely import wkt

from pyramid.response import Response

from ..views import model_context

from .interface import IFeatureLayer

def setup_pyramid(comp, config):
    DBSession = comp.env.core.DBSession

    @model_context(comp.env.layer.Layer)
    def browse(request, layer):
        return dict(
            obj=layer,
            subtitle=u"Объекты",
            custom_layout=True
        )

    config.add_route('feature_layer.feature.browse', '/layer/{id}/feature/')
    config.add_view(browse, route_name='feature_layer.feature.browse', renderer='feature_layer/feature_browse.mako')

    @model_context(comp.env.layer.Layer)
    def field(request, layer):
        return [f.to_dict() for f in layer.fields]

    config.add_route('feature_layer.field', 'layer/{id}/field/')
    config.add_view(field, route_name='feature_layer.field', renderer='json')

    @model_context(comp.env.layer.Layer)
    def store_api(request, layer):
        query = layer.feature_query()

        http_range = request.headers.get('range', None)
        if http_range and http_range.startswith('items='):
            first, last = map(int, http_range[len('items='): ].split('-', 1))
            query.limit(last - first + 1, first)
        
        features = query()
        
        result = [dict(f.fields, id=f.id) for f in features]

        headerlist = []
        if http_range:
            total = features.total_count
            last = min(total - 1, last)
            headerlist.append(
                ('Content-Range', 'items %d-%s/%d' % (first, last, total))
            )

        return Response(
            json.dumps(result),
            content_type='application/json',
            headerlist=headerlist
        )

    config.add_route('feature_layer.store_api', '/layer/{id}/store_api/')
    config.add_view(store_api, route_name='feature_layer.store_api')

    @model_context(comp.env.layer.Layer)
    def store_get_item(request, layer):
        box = request.headers.get('x-feature-box', None)

        query = layer.feature_query()
        query.filter_by(id=request.matchdict['feature_id'])

        if box:
            query.box()
        
        feature = list(query())[0]

        result = dict(feature.fields, id=feature.id)

        if box:
            result['box'] = feature.box.bounds

        return Response(
            json.dumps(result),
            content_type='application/json'
        )

    config.add_route('feature_layer.feature_get', '/layer/{id}/store_api/{feature_id}')
    config.add_view(store_get_item, route_name='feature_layer.feature_get')

    def feature_show(request):
        layer = DBSession.query(comp.env.layer.Layer) \
            .filter_by(id=request.matchdict['layer_id']) \
            .one()

        fquery = layer.feature_query()
        fquery.filter_by(id=request.matchdict['id'])

        feature = fquery().one()

        return dict(
            obj=layer,
            subtitle=u"Объект #%d" % feature.id,
            feature=feature,
        )


    config.add_route('feature_layer.feature.show', '/layer/{layer_id}/feature/{id}')
    config.add_view(feature_show, route_name='feature_layer.feature.show', renderer='feature_layer/feature_show.mako')

    comp.env.layer.layer_page_sections.register(
        key='fields',
        title=u"Атрибуты",
        template="nextgisweb:templates/feature_layer/layer_section_fields.mako",
        is_applicable=lambda (obj): IFeatureLayer.providedBy(obj)
    )
