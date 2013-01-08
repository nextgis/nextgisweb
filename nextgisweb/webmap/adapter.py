# -*- coding: utf-8 -*-
from ..registry import registry_maker


class WebMapAdapter(object):
    """ Адаптер веб-карты отвечает за то, каким образом стиль слоя будет
    отображаться на веб-карте.

    Состоит из двух частей. Первая работает на сервере и реализуется в виде
    python-класса, вторая работает не клиенте и реализуется AMD модуля. """

    registry = registry_maker()


@WebMapAdapter.registry.register
class TMSAdapter(object):
    """ Адаптер, реализующий отображение стиля слоя через TMS-подобный
    сервис, однако сам TMS-подобный сервис реализуется другим компонентов. """

    identity = 'tms'
    js_module = 'webmap/TMSAdapter'


@WebMapAdapter.registry.register
class ImageAdapter(object):
    """ Адаптер, реализующий отображение стиля слоя через сервис подобный
    WMS-запросу GetImage, однако сам WMS-подобный сервис реализуется другим
    компонентом. """

    identity = 'image'
    js_module = 'webmap/ImageAdapter'
