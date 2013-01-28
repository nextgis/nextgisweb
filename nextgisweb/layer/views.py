# -*- coding: utf-8 -*-
from pyramid.view import view_config
from pyramid.httpexceptions import HTTPFound
from pyramid.renderers import render_to_response

from bunch import Bunch

from ..models import DBSession
from ..views import model_context, permalinker, ModelController, DescriptionObjectWidget, DeleteObjectWidget
from .. import dynmenu as dm
from ..object_widget import ObjectWidget, CompositeWidget
from ..layer_group.views import LayerGroupObjectWidget
from ..psection import PageSections

from .models import Layer


class LayerObjectWidget(LayerGroupObjectWidget):
    # Виджет редактирования основных параметров слоя -
    # по сути одно и то же.
    pass


Layer.object_widget = (
    (Layer.identity, LayerObjectWidget),
    ('description', DescriptionObjectWidget),
    ('delete', DeleteObjectWidget),
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
        custom_layout=True if 'no_layout' in request.GET else False,
    )


permalinker(Layer, 'layer.show')


@view_config(route_name='layer.security')
@model_context(Layer)
def security_proxy(request, obj):
    from ..security.views import acl_editor_view
    return acl_editor_view(request, obj, obj.acl)


def setup_pyramid(comp, config):
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

        def delete_context(self, request):
            return self.edit_context(request)

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

    def store_api(request):
        query = DBSession.query(Layer)
        return [
            dict(id=l.id, display_name=l.display_name)
            for l in query
        ]

    config.add_route('layer.store_api', '/layer/store_api')
    config.add_view(store_api, route_name='layer.store_api', renderer='json')

    comp.layer_menu = dm.DynMenu(
        dm.Label('operation', u"Операции"),
        dm.Link(
            'operation/edit', u"Редактировать",
            lambda args: args.request.route_url('layer.edit', id=args.obj.id)
        ),
        dm.Link(
            'operation/delete', u"Удалить",
            lambda args: args.request.route_url('layer.delete', id=args.obj.id)
        ),
        
        dm.Label('data', u"Данные"),
    )

    comp.Layer.__dynmenu__ = comp.layer_menu

    class AddLayerDynMenu(dm.DynItem):

        def build(self, args):
            for cls in comp.Layer.registry:
                yield dm.Link(
                    'add/%s' % cls.identity, cls.cls_display_name,
                    lambda args: args.request.route_url(
                        'layer.create', _query=dict(
                            layer_group_id=args.obj.id,
                            identity=cls.identity,
                        )
                    ))

    comp.env.layer_group.LayerGroup.__dynmenu__.add(AddLayerDynMenu())

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

