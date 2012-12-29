# -*- coding: utf-8 -*-
from pyramid.view import view_config
from pyramid.response import Response

from ..views import model_context, permalinker, model_loader
from ..models import DBSession
from ..wtforms import Form, fields, validators

from ..layer import Layer

from .models import Style


EPSG_3857_BOX = (-20037508.34, -20037508.34, 20037508.34, 20037508.34)


@view_config(route_name='style.show', renderer='style/obj.mako')
@model_context(Style)
def show(reqest, obj):
    actual_class = Style.registry[obj.cls]
    obj = DBSession.query(Style) \
        .with_polymorphic((actual_class, ))\
        .filter_by(id=obj.id).one()

    return dict(
        obj=obj,
        widget_config=actual_class.widget_config(layer=obj.layer),
        widget_module=actual_class.widget_module,
    )


@view_config(route_name='style.new', renderer='style/obj.mako')
@model_context(Layer, key='layer_id')
def request(request, layer):
    cls = Style.registry[request.GET['identity']]

    return dict(
        widget_config=cls.widget_config(layer=layer),
        widget_module=cls.widget_module,
        create=True,
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

    return Response(img.getBytes(), content_type='image/png')


permalinker(Style, 'style.show')


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
