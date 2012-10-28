# -*- coding: utf-8 -*-
from wtforms import fields

from ..style import StyleNewForm

from .models import MapserverStyle


_COLORS = [
    ('', u"Нет"),
    ('0 0 0', u"Черная"),
    ('255 0 0', u"Красная"),
    ('0 255 0', u"Зеленая"),
    ('0 0 255', u"Синяя"),
]


class MapserverStyleNewForm(StyleNewForm):
    opacity = fields.IntegerField(u"Насыщенность, %", default=100)
    stroke_color = fields.SelectField(u"Цвет контура", choices=_COLORS)
    stroke_width = fields.IntegerField(u"Толщина контура", default=1)
    fill_color = fields.SelectField(u"Цвет заливки", choices=_COLORS)


MapserverStyle.__new_form = MapserverStyleNewForm
