# -*- coding: utf-8 -*-
from StringIO import StringIO

from pyramid.view import view_config
from pyramid.response import Response

from ..views import model_context, permalinker, model_loader, ModelController
from .. import action_panel as ap
from ..models import DBSession
from ..wtforms import Form, fields, validators
from ..object_widget import ObjectWidget, CompositeWidget

from ..layer import Layer

from .models import Style


EPSG_3857_BOX = (-20037508.34, -20037508.34, 20037508.34, 20037508.34)


@view_config(route_name='style.show', renderer='obj.mako')
@model_context(Style)
def show(reqest, obj):
    actual_class = Style.registry[obj.cls]
    obj = DBSession.query(Style) \
        .with_polymorphic((actual_class, ))\
        .filter_by(id=obj.id).one()

    return dict(
        obj=obj,
    )

@view_config(route_name='style.tms')
@model_context(Style)
def tms(reqest, obj):
    actual_class = Style.registry[obj.cls]
    obj = DBSession.query(Style) \
        .with_polymorphic((actual_class, ))\
        .filter_by(id=obj.id).one()

    z = int(reqest.GET['z'])
    x = int(reqest.GET['x'])
    y = int(reqest.GET['y'])

    step = (EPSG_3857_BOX[2] - EPSG_3857_BOX[0]) / 2 ** z

    box = (
        EPSG_3857_BOX[0] + x * step,
        EPSG_3857_BOX[3] - (y + 1) * step,
        EPSG_3857_BOX[0] + (x + 1) * step,
        EPSG_3857_BOX[3] - y * step,
    )

    img = obj.render_image(box, (256, 256), reqest.registry.settings)

    buf = StringIO()
    img.save(buf, 'png')
    buf.seek(0)

    return Response(body_file=buf, content_type='image/png')


permalinker(Style, 'style.show', keys=('id', 'layer_id'))


@view_config(route_name='api.style.item.retrive', renderer='json')
@model_loader(Style)
def api_style_item_retrive(request, obj):
    return obj.to_dict()


@view_config(route_name='api.style.item.replace', renderer='json')
@model_loader(Style)
def api_style_item_replace(request, obj):
    obj.from_dict(request.json_body)


@view_config(route_name='api.style.collection.create', renderer='json')
@model_loader(Layer, key='layer_id')
def api_style_collection_create(request, layer):
    data = request.json_body
    cls = Style.registry[data['cls']]
    obj = cls(layer_id=layer.id)
    obj.from_dict(request.json_body)
    DBSession.add(obj)
    DBSession.flush()

    return dict(id=obj.id)

def setup_pyramid(self, config):

    class StyleObjectWidget(ObjectWidget):
        
        def populate_obj(self):
            ObjectWidget.populate_obj(self)

            self.obj.display_name = self.data['display_name']

        def widget_module(self):
            return 'style/Widget'

        def widget_params(self):
            result = ObjectWidget.widget_params(self)

            if self.obj:
                result['value'] = dict(display_name=self.obj.display_name)

            return result

    Style.object_widget = StyleObjectWidget

    def _subwidgets(model_class):
        result = []
        while issubclass(model_class, Style):
            if hasattr(model_class, 'object_widget'):
                val = model_class.object_widget
                if issubclass(val, ObjectWidget):
                    result.append((model_class.identity, val))
                elif isinstance(val, tuple):
                    result.append(val)

            model_class = model_class.__base__

        result.reverse()

        return result

    class StyleController(ModelController):

        def create_context(self, request):
            layer = DBSession.query(Layer).filter_by(id=request.matchdict['layer_id']).one()
            identity = request.GET['identity']
            cls = Style.registry[identity]
            template_context = dict(
                obj=layer,
                subtitle=u"Новый стиль",
            )
            return locals()

        def edit_context(self, request):
            obj = DBSession.query(Style).filter_by(**request.matchdict).one()
            identity = obj.cls
            cls = Style.registry[identity]
            obj = DBSession.query(cls).get(obj.id)
            template_context = dict(
                obj=obj,
            )
            return locals()

        def widget_class(self, context, operation):
            class Composite(CompositeWidget):
                subwidget_config = _subwidgets(context['cls'])
                
            return Composite

        def create_object(self, context):
            return context['cls'](
                layer=context['layer'],
            )

        def query_object(self, context):
            return context['obj']

        def template_context(self, context):
            return context['template_context']

    StyleController(
        'style',
        url_base='/layer/{layer_id}/style',
    ).includeme(config)

    def _action_panel(self, request):
        panel = ap.P((
            ap.S('operation', u"Операции", (
                ap.I(u"Редактировать", request.route_url('style.edit', id=self.id, layer_id=self.layer_id)),
                ap.I(u"Удалить", '#'),
            )),
        ))

        return panel

    Style.__action_panel = _action_panel
