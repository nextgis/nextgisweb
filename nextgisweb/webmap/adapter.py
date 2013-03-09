# -*- coding: utf-8 -*-
from ..registry import registry_maker


class WebMapAdapter(object):
    """ Адаптер веб-карты отвечает за то, каким образом стиль слоя будет
    отображаться на веб-карте.

    Состоит из двух частей. Первая работает на сервере и реализуется в виде
    python-класса, вторая работает не клиенте и реализуется AMD модуля. """

    registry = registry_maker()


@WebMapAdapter.registry.register
class TileAdapter(object):
    """ Адаптер, реализующий отображение стиля слоя через тайловый сервис,
    однако сам сервис реализуется другим компонентом. """

    identity = 'tile'
    mid = 'webmap/TMSAdapter'
    display_name = u"Тайлы"


@WebMapAdapter.registry.register
class ImageAdapter(object):
    """ Адаптер, реализующий отображение стиля слоя через сервис подобный
    WMS-запросу GetImage, однако сам сервис реализуется другим компонентом. """

    identity = 'image'
    mid = 'webmap/ImageAdapter'
    display_name = u"Изображение"
