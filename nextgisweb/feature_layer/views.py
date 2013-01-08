# -*- coding: utf-8 -*-
import re
from shapely import wkt

from ..views import model_context

from .interface import IFeatureLayer

def setup_pyramid(comp, config):
    DBSession = comp.env.core.DBSession

    @model_context(comp.env.layer.Layer)
    def browse(request, layer):
        query = layer.feature_query()

        fields = request.GET['fields'].split(',') if 'fields' in request.GET else None
        if fields:
            query.fields(*fields)

        filter_by = dict()
        for k, v in request.GET.iteritems():
            m = re.match(ur'filter_by\[(.+)\]', k)
            if m:
                filter_by[m.group(1)] = v

        query.filter_by(**filter_by)

        if 'intersects' in request.GET:
            gwkt, gsrs = request.GET['intersects'].split(':')
            query.intersects(wkt.loads(gwkt), gsrs)

        return dict(
            obj=layer,
            subtitle=u"Объекты",
            features=query(),
        )

    config.add_route('feature_layer.feature.browse', '/layer/{id}/feature/')
    config.add_view(browse, route_name='feature_layer.feature.browse', renderer='feature_layer/feature_browse.mako')

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
