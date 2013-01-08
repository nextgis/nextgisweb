# -*- coding: utf-8 -*-
from pyramid.view import view_config
from pyramid.httpexceptions import HTTPFound
from pyramid.renderers import render_to_response

from ..wtforms import Form, fields, validators

from ..models import DBSession
from ..views import model_context, permalinker, ModelController, DescriptionObjectWidget
from .. import action_panel as ap
from ..object_widget import ObjectWidget, CompositeWidget
from ..layer_group.views import LayerGroupObjectWidget
from ..psection import PageSections

from .models import Layer


def __action_panel(self, request):
    from ..style import Style

    new_style_items = []
    for style in Style.registry:
        if style.is_layer_supported(self):
            new_style_items.append(ap.I(
                style.cls_display_name,
                request.route_url('style.create', layer_id=self.id, _query=dict(identity=style.identity))
            ))

    panel = ap.P((
        ap.S('style-new', u"Добавить стиль", new_style_items),
        ap.S('manage', u"Управление", (
            ap.I(u"Управление доступом", request.route_url('layer.security', id=self.id)),
        )),
        ap.S('operation', u"Операции", (
            ap.I(u"Редактировать", request.route_url('layer.edit', id=self.id)),
            ap.I(u"Переместить", '#'),
            ap.I(u"Удалить", request.route_url('layer_group.delete', id=self.id)),
        )),
    ))

    return panel


Layer.__action_panel = __action_panel


class LayerObjectWidget(LayerGroupObjectWidget):
    # Виджет редактирования основных параметров слоя -
    # по сути одно и то же.
    pass


Layer.object_widget = (
    (Layer.identity, LayerObjectWidget),
    ('description', DescriptionObjectWidget),
)


@view_config(route_name='layer')
def home(request):
    raise HTTPFound(location=request.route_url('layer_group'))


@view_config(route_name='layer.show', renderer='psection.mako')
@model_context(Layer)
def show(request, obj):
    actual_class = Layer.registry[obj.cls]
    obj = DBSession.query(Layer) \
        .with_polymorphic((actual_class, ))\
        .filter_by(id=obj.id).one()

    return dict(
        obj=obj,
        sections=request.env.layer.layer_page_sections,
    )


permalinker(Layer, 'layer.show')


@view_config(route_name='layer.security')
@model_context(Layer)
def security_proxy(request, obj):
    from ..security.views import acl_editor_view
    return acl_editor_view(request, obj, obj.acl)


def includeme(comp, config):
    from ..layer_group import LayerGroup

    class LayerController(ModelController):
        
        def create_context(self, request):
            layer_group = DBSession.query(LayerGroup).filter_by(id=request.GET['layer_group_id']).one()
            identity = request.GET['identity']
            cls = Layer.registry[identity]
            template_context = dict(
                obj=layer_group,
                subtitle=u"Новый слой",
            )
            return locals()

        def edit_context(self, request):
            obj = DBSession.query(Layer).filter_by(**request.matchdict).one()
            identity = obj.cls
            cls = Layer.registry[identity]
            obj = DBSession.query(cls).get(obj.id)
            template_context = dict(
                obj=obj,
            )
            return locals()

        def widget_class(self, context, operation):
            class Composite(CompositeWidget):
                model_class = context['cls']
                
            return Composite

        def create_object(self, context):
            return context['cls'](
                layer_group=context['layer_group']
            )

        def query_object(self, context):
            return context['obj']

        def template_context(self, context):
            return context['template_context']

    LayerController('layer') \
        .includeme(config)

    comp.env.layer_group.layer_group_page_sections.register(
        key='layers',
        title=u"Слои",
        template="nextgisweb:templates/layer/layer_group_section.mako"
    )
    
    comp.env.layer_group.layer_group_page_sections.register(
        key='description',
        priority=100,
        title=u"Описание",
        template="nextgisweb:templates/layer_group/section_description.mako"
    )

    comp.layer_page_sections = PageSections()

    comp.layer_page_sections.register(
        key='properties',
        priority=0,
        template="nextgisweb:templates/layer/section_properties.mako"
    )

    comp.layer_page_sections.register(
        key='description',
        priority=100,
        title=u"Описание",
        template="nextgisweb:templates/layer/section_description.mako"
    )

