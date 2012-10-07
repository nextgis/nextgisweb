# -*- coding: utf-8 -*-
from pyramid.view import view_config
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
            request.route_url('layer_group.new_group', id=self.id)
        ),
    ]

    from ..layer import Layer

    for c in Layer.registry:
        new_items.append(
            ap.I(
                c.cls_display_name,
                request.route_url(
                    'layer_group.new_layer',
                    id=self.id,
                    _query=dict(identity=c.identity)
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


class LayerGroupNewForm(Form):
    display_name = fields.TextField(u"Наименование", [validators.required()])
    keyname = fields.KeynameField()
    submit = fields.SubmitField()


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


@view_config(route_name='layer_group.new_group', renderer='layer_group/new_group.mako')
@model_context(LayerGroup)
@model_permission('layer_group:group-add')
def new_group(request, obj):
    form = LayerGroupNewForm(request.POST)
    if request.method == 'POST' and form.validate():
        newobj = LayerGroup(parent=obj)
        newobj.acl.user = request.user
        form.populate_obj(newobj)

        DBSession.add(newobj)
        DBSession.flush()
        return HTTPFound(location=request.route_url('layer_group.show', id=newobj.id))

    return dict(
        obj=obj,
        subtitle=u"Новая группа слоёв",
        form=form,
    )


@view_config(route_name='layer_group.new_layer', renderer='layer_group/new_layer.mako')
@model_context(LayerGroup)
@model_permission('layer_group:layer-add')
def group_new_layer(request, obj):
    from ..layer import Layer
    layer_cls = Layer.registry[request.GET['identity']]

    form = layer_cls.__new_form(request.POST)

    if request.method == 'POST' and form.validate():
        layer = layer_cls(layer_group=obj)
        form.populate_obj(layer)

        DBSession.add(layer)
        DBSession.flush()
        return HTTPFound(location=request.route_url('layer.show', id=layer.id))

    return dict(
        obj=obj,
        form=form
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
