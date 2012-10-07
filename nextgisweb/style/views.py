# -*- coding: utf-8 -*-
from pyramid.view import view_config

from ..views import model_context, permalinker
from ..wtforms import Form, fields, validators

from .models import Style


class StyleNewForm(Form):
    display_name = fields.TextField(
        u"Наименование",
        [validators.required(u"Необходимо указать наименование стиля"), ]
    )
    submit = fields.SubmitField()

Style.__new_form = StyleNewForm


@view_config(route_name='style.show', renderer='obj.mako')
@model_context(Style)
def show(reqest, obj):
    return dict(obj=obj)


permalinker(Style, 'style.show')
