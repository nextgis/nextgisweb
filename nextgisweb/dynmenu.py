# -*- coding: utf-8 -*-
from __future__ import unicode_literals, print_function, absolute_import
import six


class DynMenu(object):

    def __init__(self, *args):
        self._items = list()

        for item in args:
            self.add(item)

    def add(self, *items):
        self._items.extend(items)

    def build(self, args):
        result = list()

        for item in self._items:
            if isinstance(item, DynItem):
                for subitem in item.build(args):
                    result.append(subitem)
            else:
                result.append(item)

        result.sort(key=lambda item: item.key)
        return result


class Item(object):

    def __init__(self, key):

        if isinstance(key, six.string_types):
            key = tuple(key.split('/'))
        elif key is None:
            key = ()

        self._key = key

    @property
    def key(self):
        return self._key

    @property
    def level(self):
        return len(self._key) - 1


class DynItem(Item):

    def __init__(self, key=None):
        super(DynItem, self).__init__(key)

    def sub(self, value):
        if not self.key:
            return value
        else:
            if isinstance(value, six.string_types):
                value = tuple(value.split('/'))
            return self.key + value

    def build(self, args):
        pass


class Label(Item):

    def __init__(self, key, label):
        super(Label, self).__init__(key)
        self._label = label

    @property
    def label(self):
        return self._label


class Link(Item):

    def __init__(self, key, label, url, icon=None):
        super(Link, self).__init__(key)
        self._label = label
        self._url = url
        self._icon = icon

    @property
    def label(self):
        return self._label

    @property
    def url(self):
        return self._url

    @property
    def icon(self):
        return self._icon
