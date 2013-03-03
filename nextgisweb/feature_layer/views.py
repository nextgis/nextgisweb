# -*- coding: utf-8 -*-
import json
from types import MethodType

from pyramid.response import Response
from pyramid.renderers import render_to_response

from ..views import model_context
from ..geometry import geom_from_wkt
from ..object_widget import ObjectWidget, CompositeWidget
from .. import dynmenu as dm

from .interface import IFeatureLayer
from .extension import FeatureExtension


def setup_pyramid(comp, config):
    DBSession = comp.env.core.DBSession
    Layer = comp.env.layer.Layer

    class LayerFieldsWidget(ObjectWidget):

        def is_applicable(self):
            return self.operation == 'edit'

        def populate_obj(self):
            obj = self.obj
            data = self.data

            if 'feature_label_field_id' in data:
                obj.feature_label_field_id = data['feature_label_field_id']

            fields = dict(map(lambda fd: (fd['id'], fd), data['fields']))
            for f in obj.fields:
                if f.id in fields:

                    if 'display_name' in fields[f.id]:
                        f.display_name = fields[f.id]['display_name']

                    if 'grid_visibility' in fields[f.id]:
                        f.grid_visibility = fields[f.id]['grid_visibility']

        def widget_module(self):
            return 'feature_layer/LayerFieldsWidget'

        def widget_params(self):
            result = super(LayerFieldsWidget, self).widget_params()

            if self.obj:
                result['value'] = dict(
                    fields=map(lambda f: f.to_dict(), self.obj.fields),
                    feature_label_field_id=self.obj.feature_label_field_id,
                )

            return result

    comp.LayerFieldsWidget = LayerFieldsWidget

    def identify(request):
        """ Сервис идентификации объектов на слоях, поддерживающих интерфейс
        IFeatureLayer """

        srs = int(request.json_body['srs'])
        geom = geom_from_wkt(request.json_body['geom'], srid=srs)
        layers = map(int, request.json_body['layers'])

        layer_list = DBSession.query(Layer).filter(Layer.id.in_(layers))

        result = dict()

        # Количество объектов для всех слоев
        feature_count = 0

        for layer in layer_list:
            if not layer.has_permission(request.user, 'data-read'):
                result[layer.id] = dict(error="Forbidden")

            elif not IFeatureLayer.providedBy(layer):
                result[layer.id] = dict(error="Not implemented")

            else:
                query = layer.feature_query()
                query.intersects(geom)

                # Ограничиваем кол-во идентифицируемых объектов по 10 на слой,
                # иначе ответ может оказаться очень большим.
                query.limit(10)

                features = [
                    dict(id=f.id, layerId=layer.id, label=f.label, fields=f.fields)
                    for f in query()
                ]

                result[layer.id] = dict(
                    features=features,
                    featureCount=len(features)
                )

                feature_count += len(features)

        result["featureCount"] = feature_count

        return result

    config.add_route('feature_layer.identify', '/feature_layer/identify')
    config.add_view(identify, route_name='feature_layer.identify', renderer='json')

    @model_context(comp.env.layer.Layer)
    def browse(request, layer):
        request.require_permission(layer, 'data-read')
        return dict(
            obj=layer,
            subtitle=u"Объекты",
            custom_layout=True
        )

    config.add_route('feature_layer.feature.browse', '/layer/{id:\d+}/feature/')
    config.add_view(browse, route_name='feature_layer.feature.browse', renderer='feature_layer/feature_browse.mako')

    @model_context(comp.env.layer.Layer)
    def edit(request, layer):
        request.require_permission(layer, 'data-read', 'data-edit')

        query = layer.feature_query()
        query.filter_by(id=request.matchdict['feature_id'])
        feature = list(query())[0]

        swconfig = [
            ('feature_layer', layer.feature_widget()),
        ]

        for k, v in FeatureExtension.registry._dict.iteritems():
            swconfig.append((k, v(layer).feature_widget))

        class Widget(CompositeWidget):
            subwidget_config = swconfig

        widget = Widget(obj=feature, operation='edit')
        widget.bind(request=request)

        if request.method == 'POST':
            widget.bind(data=request.json_body)

            if widget.validate():
                widget.populate_obj()

                return render_to_response(
                    'json', dict(
                        status_code=200,
                        redirect=request.url
                    ),
                    request
                )

            else:
                return render_to_response(
                    'json', dict(
                        status_code=400,
                        error=widget.widget_error()
                    ),
                    request
                )

        return dict(
            widget=widget,
            obj=layer,
            subtitle=u"Объект: %s" % unicode(feature),
        )

    config.add_route('feature_layer.feature.edit', '/layer/{id:\d+}/feature/{feature_id}/edit')
    config.add_view(edit, route_name='feature_layer.feature.edit', renderer='model_widget.mako')

    @model_context(comp.env.layer.Layer)
    def field(request, layer):
        request.require_permission(layer, 'metadata-view')
        return [f.to_dict() for f in layer.fields]

    config.add_route('feature_layer.field', 'layer/{id:\d+}/field/')
    config.add_view(field, route_name='feature_layer.field', renderer='json')

    @model_context(comp.env.layer.Layer)
    def store_api(request, layer):
        request.require_permission(layer, 'data-read')

        query = layer.feature_query()

        http_range = request.headers.get('range', None)
        if http_range and http_range.startswith('items='):
            first, last = map(int, http_range[len('items='):].split('-', 1))
            query.limit(last - first + 1, first)

        features = query()

        result = [dict(f.fields, id=f.id, label=f.label) for f in features]

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

    config.add_route('feature_layer.store_api', '/layer/{id:\d+}/store_api/')
    config.add_view(store_api, route_name='feature_layer.store_api')

    @model_context(comp.env.layer.Layer)
    def store_get_item(request, layer):
        request.require_permission(layer, 'data-read')

        box = request.headers.get('x-feature-box', None)
        ext = request.headers.get('x-feature-ext', None)

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
            json.dumps(result),
            content_type='application/json'
        )

    config.add_route('feature_layer.feature_get', '/layer/{id:\d+}/store_api/{feature_id:\d+}')
    config.add_view(store_get_item, route_name='feature_layer.feature_get')

    def feature_show(request):
        layer = DBSession.query(comp.env.layer.Layer) \
            .filter_by(id=request.matchdict['layer_id']) \
            .one()

        request.require_permission(layer, 'data-read')

        fquery = layer.feature_query()
        fquery.filter_by(id=request.matchdict['id'])

        feature = fquery().one()

        return dict(
            obj=layer,
            subtitle=u"Объект #%d" % feature.id,
            feature=feature,
        )

    config.add_route('feature_layer.feature.show', '/layer/{layer_id:\d+}/feature/{id:\d+}')
    config.add_view(feature_show, route_name='feature_layer.feature.show', renderer='feature_layer/feature_show.mako')

    def client_settings(self, request):
        return dict(
            extensions=dict(
                map(
                    lambda ext: (ext.identity, dict(
                        displayWidget=ext.display_widget
                    )),
                    FeatureExtension.registry
                )
            )
        )

    comp.client_settings = MethodType(client_settings, comp, comp.__class__)

    # Расширения меню слоя
    class LayerMenuExt(dm.DynItem):

        def build(self, args):
            if IFeatureLayer.providedBy(args.obj):
                yield dm.Link(
                    'data/browse-feature', u"Таблица объектов",
                    lambda args: args.request.route_url(
                        "feature_layer.feature.browse",
                        id=args.obj.id
                    )
                )

    comp.env.layer.layer_menu.add(LayerMenuExt())

    comp.env.layer.layer_page_sections.register(
        key='fields',
        title=u"Атрибуты",
        template="nextgisweb:templates/feature_layer/layer_section_fields.mako",
        is_applicable=lambda (obj): IFeatureLayer.providedBy(obj)
    )
