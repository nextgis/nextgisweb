# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from ..resource import Widget, Resource


class Widget(Widget):
    resource = Resource
    operation = ('create', 'update')
    amdmod = 'ngw-resmeta/Widget'


def setup_pyramid(comp, config):
    Resource.__psection__.register(
        key='resmeta',
        priority=40,
        title="Метаданные",
        is_applicable=lambda obj: len(obj.resmeta) > 0,
        template='nextgisweb:resmeta/template/section.mako')
