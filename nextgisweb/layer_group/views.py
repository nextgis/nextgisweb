# -*- coding: utf-8 -*-
from pyramid.renderers import render_to_response
from pyramid.httpexceptions import HTTPFound

from bunch import Bunch

from ..models import DBSession
from ..wtforms import Form, fields, validators
from ..views import model_context, model_permission, permalinker, ModelController, DescriptionObjectWidget, DeleteObjectWidget
from ..object_widget import CompositeWidget
from .. import dynmenu as dm
from ..psection import PageSections

from ..object_widget import ObjectWidget


class LayerGroupObjectWidget(ObjectWidget):

    def is_applicable(self):
        return self.operation in ('create', 'edit')

    def populate_obj(self):
        ObjectWidget.populate_obj(self)

        self.obj.display_name = self.data['display_name']
        self.obj.keyname = self.data['keyname']

    def validate(self):
        result = ObjectWidget.validate(self)
        self.error = []

        return result

    def widget_params(self):
        result = ObjectWidget.widget_params(self)

        if self.obj:
            result['value'] = dict(
                display_name=self.obj.display_name,
                keyname=self.obj.keyname,
            )

        return result

    def widget_module(self):
        return 'layer_group/Widget'


def setup_pyramid(comp, config):
    DBSession = comp.env.core.DBSession
    ACLController = comp.env.security.ACLController

    LayerGroup = comp.LayerGroup

    ACLController(LayerGroup).includeme(config)
    
    def layer_group_home(request):
        return HTTPFound(location=request.route_url('layer_group.show', id=0))

    config.add_route('layer_group', '/layer_group/').add_view(layer_group_home)

    @model_context(LayerGroup)
    def show(request, obj):
        request.require_permission(obj, 'read')

        return dict(
            obj=obj,
            sections=request.env.layer_group.layer_group_page_sections
        )

    config.add_route('layer_group.show', '/layer_group/{id:\d+}') \
        .add_view(show, renderer="psection.mako")

    @model_context(LayerGroup)
    def api_layer_group_tree(request, obj):

        def traverse(layer_group):
            return dict(
                type='layer_group', id=layer_group.id,
                display_name=layer_group.display_name,
                children=[traverse(c) for c in layer_group.children],
                layers=[
                    dict(
                        type='layer', id=l.id,
                        display_name=l.display_name,
                        styles=[
                            dict(
                                type='style', id=s.id,
                                display_name=s.display_name
                            ) for s in l.styles
                        ]
                    ) for l in layer_group.layers
                ]
            )

        return traverse(obj)

    config.add_route('api.layer_group.tree', '/api/layer_group/{id:\d+}/tree') \
        .add_view(api_layer_group_tree, renderer="json")

    permalinker(LayerGroup, 'layer_group.show')
    
    LayerGroup.object_widget = (
        ('layer_group', LayerGroupObjectWidget),
        ('description', DescriptionObjectWidget),
        ('delete', DeleteObjectWidget),
    )

    class LayerGroupController(ModelController):

        def create_context(self, request):
            parent = LayerGroup.filter_by(id=request.GET['parent_id']).one()
            request.require_permission(parent, 'create')

            owner_user = request.user

            template_context = dict(
                obj=parent,
                subtitle=u"Новая группа слоёв",
            )
            return locals()

        def edit_context(self, request):
            obj = LayerGroup.filter_by(**request.matchdict).one()
            request.require_permission(obj, 'update')

            template_context = dict(
                obj=obj,
            )
            return locals()

        def delete_context(self, request):
            obj = LayerGroup.filter_by(**request.matchdict).one()
            request.require_permission(obj, 'delete')

            template_context = dict(
                obj=obj,
            )
            return locals()

        def widget_class(self, context, operation):
            class Composite(CompositeWidget):
                model_class = LayerGroup

            return Composite

        def create_object(self, context):
            return LayerGroup(
                parent=context['parent'],
                owner_user=context['owner_user']
            )

        def query_object(self, context):
            return context['obj']

        def template_context(self, context):
            return context['template_context']

    LayerGroupController('layer_group') \
        .includeme(config)

    comp.LayerGroup.__dynmenu__ = dm.DynMenu(
        dm.Label('add', u"Добавить"),
        dm.Link(
            'add/layer_group', u"Группа слоёв",
            lambda args: args.request.route_url(
                'layer_group.create', _query=dict(
                    parent_id=args.obj.id,
                )
            )
        ),
        dm.Label('operation', u"Операции"),
        dm.Link(
            'operation/edit', u"Редактировать",
            lambda args: args.request.route_url('layer_group.edit', id=args.obj.id)
        ),
        dm.Link(
            'operation/delete', u"Удалить",
            lambda args: args.request.route_url('layer_group.delete', id=args.obj.id)
        ),
        dm.Link(
            'operation/acl', u"Управление доступом",
            lambda args: args.request.route_url('layer_group.acl', id=args.obj.id)
        ),
   )

    comp.layer_group_page_sections = PageSections()

    comp.layer_group_page_sections.register(
        key='children',
        priority=0,
        template="nextgisweb:templates/layer_group/section_children.mako"
    )

    comp.layer_group_page_sections.register(
        key='permissions',
        priority=90,
        title=u"Права пользователя",
        template="security/section_resource_permissions.mako"
    )
