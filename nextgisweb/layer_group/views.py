# -*- coding: utf-8 -*-
from pyramid.view import view_config
from pyramid.renderers import render_to_response
from pyramid.httpexceptions import HTTPFound

from ..models import DBSession
from ..wtforms import Form, fields, validators
from ..views import model_context, model_permission, permalinker, ModelController, DescriptionObjectWidget, DeleteObjectWidget
from ..object_widget import CompositeWidget
from .. import action_panel as ap
from ..psection import PageSections

from .models import LayerGroup


def __action_panel(self, request):
    new_items = [
        ap.I(
            u"Группа слоев",
            request.route_url('layer_group.create', _query=dict(parent_id=self.id))
        ),
    ]

    from ..layer import Layer

    for c in Layer.registry:
        new_items.append(
            ap.I(
                c.cls_display_name,
                request.route_url(
                    'layer.create',
                    _query=dict(identity=c.identity, layer_group_id=self.id)
                )
            )
        )

    panel = ap.P((
        ap.S('new', u"Добавить", new_items),
        # ap.S('permission', u"Управление доступом", (
        #     ap.I(u"Изменить права", request.route_url('layer_group.edit_security', id=self.id)),
        #     ap.I(u"Права пользователя", request.route_url('layer_group.show_security', id=self.id)),
        # )),
        ap.S('operation', u"Операции", (
            ap.I(u"Редактировать", request.route_url('layer_group.edit', id=self.id)),
            # ap.I(u"Переместить", '#'),
            ap.I(u"Удалить", request.route_url('layer_group.delete', id=self.id)),
        )),
    ))
    return panel


LayerGroup.__action_panel = __action_panel


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

LayerGroup.object_widget = (
    ('layer_group', LayerGroupObjectWidget),
    ('description', DescriptionObjectWidget),
    ('delete', DeleteObjectWidget),
)


@view_config(route_name='layer_group')
def home(request):
    return HTTPFound(location=request.route_url('layer_group.show', id=0))


@view_config(route_name='layer_group.show', renderer='psection.mako')
@model_context(LayerGroup)
@model_permission('layer_group:read')
def show(request, obj):
    return dict(
        obj=obj,
        sections=request.env.layer_group.layer_group_page_sections
    )

permalinker(LayerGroup, 'layer_group.show')


@view_config(route_name='layer_group.edit_security')
@view_config(route_name='layer_group.show_security')
@model_context(LayerGroup)
@model_permission('layer_group:security')
def edit_security_proxy(request, obj):
    from ..security.views import acl_editor_view
    return acl_editor_view(request, obj, obj.acl)


@view_config(route_name="api.layer_group.tree", renderer='json')
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


def includeme(comp, config):

    class LayerGroupController(ModelController):

        def create_context(self, request):
            parent = DBSession.query(LayerGroup).filter_by(id=request.GET['parent_id']).one()
            template_context = dict(
                obj=parent,
                subtitle=u"Новая группа слоёв",
            )
            return locals()

        def edit_context(self, request):
            obj = DBSession.query(LayerGroup).filter_by(**request.matchdict).one()
            template_context = dict(
                obj=obj,
            )
            return locals()

        delete_context = edit_context

        def widget_class(self, context, operation):
            class Composite(CompositeWidget):
                model_class = LayerGroup

            return Composite

        def create_object(self, context):
            return LayerGroup(parent=context['parent'])

        def query_object(self, context):
            return context['obj']

        def template_context(self, context):
            return context['template_context']

    LayerGroupController('layer_group') \
        .includeme(config)

    comp.layer_group_page_sections = PageSections()

    comp.layer_group_page_sections.register(
        key='children',
        priority=0,
        template="nextgisweb:templates/layer_group/section_children.mako"
    )
