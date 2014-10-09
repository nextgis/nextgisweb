# -*- coding: utf-8 -*-
from __future__ import unicode_literals

__all__ = [
    'ResourceError',
    'ForbiddenError',
    'ValidationError',
    'OperationalError',
    'Forbidden',
]


class ResourceError(Exception):
    """ Базовый класс для исключительных ситуаций ресурса """


class ForbiddenError(ResourceError):
    pass


class ValidationError(ResourceError):
    """ Исключительная ситуация вызванная некорректными данными со стороны
    пользователя или внешнего сервиса """


class OperationalError(ResourceError):
    """ Исключительная ситуация вызванная неправильным функционированием
    системы, что-то пошло не так в общем """


Forbidden = ForbiddenError  # TODO: Depricate
