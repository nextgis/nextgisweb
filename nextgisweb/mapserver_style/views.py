# -*- coding: utf-8 -*-
from wtforms import fields

from ..style import StyleNewForm

from .models import MapserverStyle


_COLORS = [
    (None, u"Нет"),
    ('0 0 0', u"Черная"),
    ('255 0 0', u"Красная"),
    ('0 255 0', u"Зеленая"),
    ('0 0 255', u"Синяя"),
]


class MapserverStyleNewForm(StyleNewForm):
    stroke_color = fields.SelectField(u"Обводка", choices=_COLORS)
    fill_color = fields.SelectField(u"Заливка", choices=_COLORS)


MapserverStyle.__new_form = MapserverStyleNewForm
