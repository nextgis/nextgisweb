# -*- coding: utf-8 -*-
from .registry import registry_maker


class Command(object):
    registry = registry_maker()
