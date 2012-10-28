# -*- coding: utf-8 -*-
from pyramid.view import view_config
from pyramid.response import Response

from ..views import model_context, permalinker
from ..models import DBSession
from ..wtforms import Form, fields, validators

from .models import Style


EPSG_3857_BOX = (-20037508.34, -20037508.34, 20037508.34, 20037508.34)


class StyleNewForm(Form):
    display_name = fields.TextField(
        u"Наименование",
        [validators.required(u"Необходимо указать наименование стиля"), ]
    )
    default = fields.BooleanField(u"Использовать по-умолчанию")
    submit = fields.SubmitField()


Style.__new_form = StyleNewForm


@view_config(route_name='style.show', renderer='obj.mako')
@model_context(Style)
def show(reqest, obj):
    return dict(obj=obj)


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
