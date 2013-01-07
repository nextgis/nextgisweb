# -*- coding: utf-8 -*-
import re

from ..views import model_context
from shapely import wkt


def setup_pyramid(comp, config):

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
            subtitle=u"Элементы",
            features=query(),
        )

    config.add_route('feature_layer.browse', '/layer/{id}/feature/')
    config.add_view(browse, route_name='feature_layer.browse', renderer='feature_layer/browse.mako')
