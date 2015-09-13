# -*- coding: utf-8 -*-
from __future__ import unicode_literals, print_function, absolute_import


class PageSection(object):

    def __init__(
        self, key=None, title=None, priority=50,
        template=None, is_applicable=None
    ):
        if not is_applicable:
            is_applicable = _always_applicable

        self.key = key
        self.title = title
        self.priority = priority
        self.template = template
        self.is_applicable = is_applicable


class PageSections(object):

    def __init__(self):
        self._items = []

    def __iter__(self):
        items = list(self._items)
        items.sort(key=lambda (itm): itm.priority)
        return items.__iter__()

    def register(self, **kwargs):
        self._items.append(PageSection(**kwargs))


def _always_applicable(*args, **kwargs):
    return True
