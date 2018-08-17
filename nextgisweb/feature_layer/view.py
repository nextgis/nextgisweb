# -*- coding: utf-8 -*-
import json
import re
import urllib
from types import MethodType
from collections import OrderedDict

import geojson
from pyramid.response import Response

from ..resource import (
    Resource,
    ResourceScope,
    DataStructureScope,
    DataScope,
    resource_factory,
    Widget)
from ..geometry import geom_from_wkt
from ..pyramid import viewargs
from .. import dynmenu as dm

from .interface import IFeatureLayer
from .extension import FeatureExtension
from .util import _


class ComplexEncoder(geojson.GeoJSONEncoder):
    def default(self, obj):
        try:
            return geojson.GeoJSONEncoder.default(self, obj)
        except TypeError:
            return str(obj)


class FeatureLayerFieldsWidget(Widget):
    interface = IFeatureLayer
    operation = ('update', )
    amdmod = 'ngw-feature-layer/FieldsWidget'


PD_READ = DataScope.read
PD_WRITE = DataScope.write

PDS_R = DataStructureScope.read
PDS_W = DataStructureScope.write

PR_R = ResourceScope.read


@viewargs(renderer='nextgisweb:feature_layer/template/feature_browse.mako')
def feature_browse(request):
    request.resource_permission(PD_READ)
    request.resource_permission(PDS_R)
    return dict(obj=request.context, subtitle=_(u"Feature table"),
                maxwidth=True, maxheight=True)


@viewargs(renderer='nextgisweb:feature_layer/template/feature_show.mako')
def feature_show(request):
    request.resource_permission(PD_READ)

    feature_id = int(request.matchdict['feature_id'])

    ext_mid = OrderedDict()
    for k, ecls in FeatureExtension.registry._dict.iteritems():
        if hasattr(ecls, 'display_widget'):
            ext_mid[k] = ecls.display_widget

    return dict(
        obj=request.context,
        subtitle=_(u"Feature #%d") % feature_id,
        feature_id=feature_id,
        ext_mid=ext_mid)


@viewargs(renderer='nextgisweb:feature_layer/template/widget.mako')
def feature_update(request):
    request.resource_permission(PD_WRITE)

    feature_id = int(request.matchdict['feature_id'])

    fields = []
    for f in request.context.fields:
        fields.append(OrderedDict((
            ('keyname', f.keyname),
            ('display_name', f.display_name),
            ('datatype', f.datatype),
        )))

    return dict(
        obj=request.context,
        feature_id=feature_id,
        fields=fields,
        subtitle=_(u"Feature #%d") % feature_id,
        maxheight=True)


def field_collection(request):
    request.resource_permission(PDS_R)
    return [f.to_dict() for f in request.context.fields]


def store_collection(layer, request):
    request.resource_permission(PD_READ)

    query = layer.feature_query()

    http_range = request.headers.get('range')
    if http_range and http_range.startswith('items='):
        first, last = map(int, http_range[len('items='):].split('-', 1))
        query.limit(last - first + 1, first)

    field_prefix = json.loads(
        urllib.unquote(request.headers.get('x-field-prefix', '""')))
    pref = lambda (f): field_prefix + f

    field_list = json.loads(
        urllib.unquote(request.headers.get('x-field-list', "[]")))
    if len(field_list) > 0:
        query.fields(*field_list)

    box = request.headers.get('x-feature-box')
    if box:
        query.box()

    like = request.params.get('like', '')
    if like != '':
        query.like(like)

    sort_re = re.compile(r'sort\(([+-])%s(\w+)\)' % (field_prefix, ))
    sort = sort_re.search(urllib.unquote(request.query_string))
    if sort:
        sort_order = {'+': 'asc', '-': 'desc'}[sort.group(1)]
        sort_colname = sort.group(2)
        query.order_by((sort_order, sort_colname), )

    features = query()

    result = []
    for fobj in features:
        fdata = dict(
            [(pref(k), v) for k, v in fobj.fields.iteritems()],
            id=fobj.id, label=fobj.label)
        if box:
            fdata['box'] = fobj.box.bounds

        result.append(fdata)

    headers = dict()
    headers["Content-Type"] = 'application/json'

    if http_range:
        total = features.total_count
        last = min(total - 1, last)
        headers['Content-Range'] = 'items %d-%s/%d' % (first, last, total)

    return Response(json.dumps(result, cls=ComplexEncoder), headers=headers)


def store_item(layer, request):
    request.resource_permission(PD_READ)

    box = request.headers.get('x-feature-box')
    ext = request.headers.get('x-feature-ext')

    query = layer.feature_query()
    query.filter_by(id=request.matchdict['feature_id'])

    if box:
        query.box()

    feature = list(query())[0]

    result = dict(
        feature.fields,
        id=feature.id, layerId=layer.id,
        fields=feature.fields
    )

    if box:
        result['box'] = feature.box.bounds

    if ext:
        result['ext'] = dict()
        for extcls in FeatureExtension.registry:
            extension = extcls(layer=layer)
            result['ext'][extcls.identity] = extension.feature_data(feature)

    return Response(
        json.dumps(result, cls=ComplexEncoder),
        content_type='application/json')


def setup_pyramid(comp, config):
    config.add_route(
        'feature_layer.feature.browse',
        '/resource/{id:\d+}/feature/',
        factory=resource_factory,
        client=('id', )
    ).add_view(feature_browse, context=IFeatureLayer)

    config.add_route(
        'feature_layer.feature.show',
        '/resource/{id:\d+}/feature/{feature_id:\d+}',
        factory=resource_factory,
        client=('id', 'feature_id')
    ).add_view(feature_show, context=IFeatureLayer)

    config.add_route(
        'feature_layer.feature.update',
        '/resource/{id:\d+}/feature/{feature_id}/update',
        factory=resource_factory,
        client=('id', 'feature_id')
    ).add_view(feature_update, context=IFeatureLayer)

    config.add_route(
        'feature_layer.field', '/resource/{id:\d+}/field/',
        factory=resource_factory,
        client=('id', )
    ).add_view(field_collection, context=IFeatureLayer, renderer='json')

    config.add_route(
        'feature_layer.store',
        '/resource/{id:\d+}/store/',
        factory=resource_factory, client=('id', )
    ).add_view(store_collection, context=IFeatureLayer)

    config.add_route(
        'feature_layer.store.item',
        '/resource/{id:\d+}/store/{feature_id:\d+}',
        factory=resource_factory,
        client=('id', 'feature_id')
    ).add_view(store_item, context=IFeatureLayer)

    def client_settings(self, request):
        editor_widget = OrderedDict()
        for k, ecls in FeatureExtension.registry._dict.iteritems():
            if hasattr(ecls, 'editor_widget'):
                editor_widget[k] = ecls.editor_widget

        return dict(
            editor_widget=editor_widget,
            extensions=dict(map(
                lambda ext: (ext.identity, ext.display_widget),
                FeatureExtension.registry
            )),
            identify=dict(
                attributes=self.settings['identify.attributes']
            ),
            search=dict(
                nominatim=self.settings['search.nominatim']
            )
        )

    comp.client_settings = MethodType(client_settings, comp, comp.__class__)

    # Layer menu extension
    class LayerMenuExt(dm.DynItem):

        def build(self, args):
            if IFeatureLayer.providedBy(args.obj):
                yield dm.Label('feature_layer', _(u"Vector layer"))

                yield dm.Link(
                    'feature_layer/feature-browse', _(u"Feature table"),
                    lambda args: args.request.route_url(
                        "feature_layer.feature.browse",
                        id=args.obj.id))

                yield dm.Link(
                    'feature_layer/geojson', _(u"Download as GeoJSON"),
                    lambda args: args.request.route_url(
                        "feature_layer.geojson", id=args.obj.id))

                yield dm.Link(
                    'feature_layer/geojson', _(u"Download as CSV"),
                    lambda args: args.request.route_url(
                        "feature_layer.csv", id=args.obj.id))

    Resource.__dynmenu__.add(LayerMenuExt())

    Resource.__psection__.register(
        key='fields', title=_(u"Attributes"),
        template="nextgisweb:feature_layer/template/section_fields.mako",
        is_applicable=lambda (obj): IFeatureLayer.providedBy(obj))
