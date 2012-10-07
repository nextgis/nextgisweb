# -*- coding: utf-8 -*-
from pyramid.view import view_config
from pyramid.httpexceptions import HTTPFound
from pyramid.renderers import render_to_response

from ..wtforms import Form, fields, validators

from ..models import DBSession
from ..views import model_context, permalinker
from .. import action_panel as ap

from .models import Layer


def __action_panel(self, request):
    from ..style import Style

    new_style_items = []
    for style in Style.registry:
        if style.is_layer_supported(self):
            new_style_items.append(ap.I(
                style.cls_display_name,
                request.route_url('layer.new_style', id=self.id, _query=dict(identity=style.identity))
            ))

    panel = ap.P((
        ap.S('style-new', u"Добавить стиль", new_style_items),
        ap.S('manage', u"Управление", (
            ap.I(u"Управление доступом", request.route_url('layer.security', id=self.id)),
        )),
        ap.S('operation', u"Операции", (
            ap.I(u"Переместить", '#'),
            ap.I(u"Удалить", request.route_url('layer_group.delete', id=self.id)),
        )),
    ))

    return panel


Layer.__action_panel = __action_panel


class LayerNewForm(Form):
    display_name = fields.TextField(
        u"Наименование",
        [validators.required(u"Необходимо указать наименование слоя"), ]
    )
    keyname = fields.KeynameField()
    submit = fields.SubmitField()

Layer.__new_form = LayerNewForm
Layer.__show_template = 'layer/show.mako'


@view_config(route_name='layer')
def home(request):
    raise HTTPFound(location=request.route_url('layer_group'))


@view_config(route_name='layer.show')
@model_context(Layer)
def show(request, obj):
    actual_class = Layer.registry[obj.cls]
    obj = DBSession.query(Layer) \
        .with_polymorphic((actual_class, ))\
        .filter_by(id=obj.id).one()

    return render_to_response(
        actual_class.__show_template,
        dict(obj=obj),
        request
    )


permalinker(Layer, 'layer.show')


@view_config(route_name="layer.new_style", renderer="layer/new_style.mako")
@model_context(Layer)
def new_style(request, obj):
    from ..style import Style
    style_cls = Style.registry[request.GET['identity']]
    form = style_cls.__new_form(request.POST)

    if request.method == 'POST' and form.validate():
        style = style_cls(layer=obj)
        form.populate_obj(style)

        DBSession.add(style)
        DBSession.flush()

    return dict(obj=obj, form=form)


@view_config(route_name='layer.security')
@model_context(Layer)
def security_proxy(request, obj):
    from ..security.views import acl_editor_view
    return acl_editor_view(request, obj, obj.acl)
