# -*- coding: utf-8 -*-
from __future__ import division, unicode_literals, print_function, absolute_import
from .registry import registry_maker


class Command(object):
    registry = registry_maker()
