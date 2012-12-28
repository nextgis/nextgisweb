# -*- coding: utf-8 -*-
from ..registry import registry_maker


class WebMapAdapter(object):

    registry = registry_maker()


@WebMapAdapter.registry.register
class TMSAdapter(object):
    identity = 'tms'
    js_module = 'webmap/TMSAdapter'


@WebMapAdapter.registry.register
class ImageAdapter(object):
    identity = 'image'
    js_module = 'webmap/ImageAdapter'
