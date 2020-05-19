# -*- coding: utf-8 -*-
from __future__ import division, absolute_import, print_function, unicode_literals

from ..resource import Resource, Widget


class Widget(Widget):
    resource = Resource
    operation = ('create', 'update')
    amdmod = 'ngw-resource-social/Widget'

    def is_applicable(self):
        return self.obj.check_social_editable()
