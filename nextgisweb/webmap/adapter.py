# -*- coding: utf-8 -*-
from __future__ import unicode_literals, print_function, absolute_import
from ..registry import registry_maker
from .util import _


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
    mid = 'ngw-webmap/TileAdapter'
    display_name = _("Tiles")


@WebMapAdapter.registry.register
class ImageAdapter(object):
    """ Адаптер, реализующий отображение стиля слоя через сервис подобный
    WMS-запросу GetImage, однако сам сервис реализуется другим компонентом. """

    identity = 'image'
    mid = 'ngw-webmap/ImageAdapter'
    display_name = _("Image")
