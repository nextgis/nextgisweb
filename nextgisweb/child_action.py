# -*- coding: utf-8 -*-
from __future__ import division, unicode_literals, print_function, absolute_import


class ChildAction(object):

    def __init__(
        self, title=None, priority=50,
        icon_material=None, permissions=(), route=None
    ):
        self.title = title
        self.priority = priority
        self.icon_material = icon_material
        self.permissions = permissions
        self.route = route


class ChildActions(object):

    def __init__(self):
        self._items = []

    def __iter__(self):
        items = list(self._items)
        items.sort(key=lambda itm: -itm.priority)
        return items.__iter__()

    def register(self, **kwargs):
        self._items.append(ChildAction(**kwargs))
