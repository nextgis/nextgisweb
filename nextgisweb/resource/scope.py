# -*- coding: utf-8 -*-
""" Универсальные наборы прав доступа """

from __future__ import unicode_literals
from .permission import Scope, Permission

__all__ = [
    'ResourceScope',
    'MetadataScope',
    'DataStructureScope',
    'DataScope',
    'ConnectionScope',
]

P = Permission


class ResourceScope(Scope):
    """ Основной набор прав ресурса """

    identity = 'resource'
    label = "Ресурс"

    read = P("Чтение")
    create = P("Создание").require(read)
    update = P("Изменение").require(read)
    delete = P("Удаление").require(read)

    manage_children = P("Управление дочерними ресурсами").require(read)
    change_permissions = P("Управление правами доступа").require(read)


class MetadataScope(Scope):
    """ Набор прав метаданных

    Типичный пример метаданных ресурса - его описание в свободной форме. Это
    описание фактически ни на что не влияет, его изменение не приводит к
    изменению структуры данных или чего-либо еще.

    Поскольку у каждого типа ресурсов есть описание, то этот набор прав
    включен для всех ресурсов на уровне класса Resource. """

    identity = 'metadata'
    label = "Метаданные"

    read = P("Чтение")
    write = P("Запись").require(read)


class DataStructureScope(Scope):
    """ Набор прав структуры данных

    Типичный пример - стурктура полей векторного слоя, ее изменение может
    приводить к изменению содержимого самих данных. """

    identity = 'datastruct'
    label = "Структура данных"

    read = P("Чтение")
    write = P("Запись").require(read)


class DataScope(Scope):
    """ Набор прав доступа к данным """

    identity = 'data'
    label = "Данные"

    read = P("Чтение")
    write = P("Запись").require(read)


class ConnectionScope(Scope):
    """ Набор прав параметров внешнего соединения

    В некоторых случаях требуется хранить в ресурсе параметры доступа к
    внешним ресурсам. Эти параметры могут содержать чувствительные данные с
    точки зрения безопасности, например логины и пароли для доступа к
    удаленной БД. """

    identity = 'connection'
    label = "Соединение"

    read = P("Чтение параметров соединения")
    write = P("Запись параметров соединения").require(read)
    connect = P("Использование соединения")
