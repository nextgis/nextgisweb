# -*- coding: utf-8 -*-
from pyramid.view import view_config
from pyramid.renderers import render_to_response
from pyramid.httpexceptions import HTTPFound

from ..models import DBSession
from ..wtforms import Form, fields, validators
from ..views import model_context, model_permission, permalinker
from .. import action_panel as ap

from .models import LayerGroup


def __action_panel(self, request):
    new_items = [
        ap.I(
            u"Группа слоев",
            request.route_url('layer_group.new', _query=dict(parent_id=self.id))
        ),
    ]

    from ..layer import Layer

    for c in Layer.registry:
        new_items.append(
            ap.I(
                c.cls_display_name,
                request.route_url(
                    'layer.new',
                    _query=dict(identity=c.identity, layer_group_id=self.id)
                )
            )
        )

    panel = ap.P((
        ap.S('new', u"Добавить", new_items),
        ap.S('permission', u"Управление доступом", (
            ap.I(u"Изменить права", request.route_url('layer_group.edit_security', id=self.id)),
            ap.I(u"Права пользователя", request.route_url('layer_group.show_security', id=self.id)),
        )),
        ap.S('operation', u"Операции", (
            ap.I(u"Переместить", '#'),
            ap.I(u"Удалить", request.route_url('layer_group.delete', id=self.id)),
        )),
    ))
    return panel


LayerGroup.__action_panel = __action_panel


from ..object_widget import ObjectWidget

class LayerGroupObjectWidget(ObjectWidget):

    def populate_obj(self):
        ObjectWidget.populate_obj(self)

        self.obj.display_name = self.data['display_name']
        self.obj.keyname = self.data['keyname']

    def validate(self):
        result = ObjectWidget.validate(self)
        self.error = [];

        return result

    def widget_module(self):
        # Временно используем тот же виджет, что и для слоя
        return 'layer/Widget'

LayerGroup.object_widget = LayerGroupObjectWidget


@view_config(route_name='layer_group')
def home(request):
    return HTTPFound(location=request.route_url('layer_group.show', id=0))


@view_config(route_name='layer_group.show', renderer='layer_group/show.mako')
@model_context(LayerGroup)
@model_permission('layer_group:read')
def show(request, obj):
    return dict(
        obj=obj,
    )

permalinker(LayerGroup, 'layer_group.show')


@view_config(route_name='layer_group.new')
def new(request):
    parent = DBSession.query(LayerGroup).filter_by(id=request.GET['parent_id']).one()

    widget = LayerGroupObjectWidget()

    if request.method == 'POST':
        widget.bind(data=request.json_body, request=request)
        
        if widget.validate():
            obj = LayerGroup(parent=parent)
            DBSession.add(obj)

            widget.bind(obj=obj)
            widget.populate_obj()

            DBSession.flush()
            return render_to_response('json', dict(
                status_code=200,
                redirect=obj.permalink(request),
            ))
        else:
            return render_to_response('json', dict(
                status_code=400,
                error=widget.widget_error(),
            ))

    return render_to_response(
        'layer_group/new.mako',
        dict(
            obj=parent,
            subtitle=u"Новая группа слоёв",
            widget=widget
        ),
        request
    )


@view_config(route_name='layer_group.delete', renderer='layer_group/delete.mako')
@model_context(LayerGroup)
@model_permission('layer_group:delete')
def delete(request, obj):
    context = dict(obj=obj)

    if obj.id == 0:
        context['no_delete'] = True
        return context

    form = DeleteGroupForm(request.POST)
    context['form'] = form

    if request.method == 'POST' and form.validate():
        parent_id = obj.parent_id

        try:
            if form.child.data == 'move_to_parent':
                for child in obj.children:
                    child.parent = obj.parent
                for layer in obj.layers:
                    layer.layer_group = obj.parent
            elif form.child.data == 'delete_cascade':
                def cascade(o):
                    for child in list(o.children):
                        DBSession.delete(child)

                    for layer in o.layers:
                        DBSession.delete(layer)

                cascade(obj)

            DBSession.delete(obj)
            DBSession.flush()
        except IntegrityError:
            context['error'] = u"Не удалось удалить группу слоёв. Возможно данные были изменены."
            return context

    return context


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
