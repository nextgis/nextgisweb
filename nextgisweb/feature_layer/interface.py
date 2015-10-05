# -*- coding: utf-8 -*-
from zope.interface import Interface, Attribute

from ..resource import IResourceBase


class GEOM_TYPE(object):
    POINT = 'POINT'
    LINESTING = 'LINESTRING'
    POLYGON = 'POLYGON'

    enum = (POINT, LINESTING, POLYGON)


class FIELD_TYPE(object):
    INTEGER = 'INTEGER'
    REAL = 'REAL'
    STRING = 'STRING'
    DATE = 'DATE'
    TIME = 'TIME'
    DATETIME = 'DATETIME'

    enum = (INTEGER, REAL, STRING, DATE, TIME, DATETIME)


class IFeatureLayer(IResourceBase):

    geometry_type = Attribute(""" Тип геометрии слоя GEOM_TYPE """)
    fields = Attribute(""" Список полей """)

    feature_query = Attribute(""" Класс запроса объектов """)

    def field_by_keyname(self, keyname):
        """ Получить поле по ключу. Если поле не найдено, то должно
        вызываться исключение KeyError. """


class IWritableFeatureLayer(IFeatureLayer):
    """ Слой объектов, поддерживающий запись """

    def feature_create(self, feature):
        """ Вставить в БД новый объект, описание которого дается в feature

        :param feature: описание объекта
        :type feature:  dict

        :return:        ID вставленного объекта
        """

    def feature_delete(self, feature_id):
        """ Удалить запись с заданным id

        :param feature_id: идентификатор записи
        :type feature_id:  int or bigint
        """

    def feature_delete_all(self):
        """ Удалить все записи слоя """

    def feature_put(self, feature):
        """ Сохранить объект в слое """


class IFeatureQuery(Interface):

    def fields(self, *args):
        """ Установить список полей запроса. Если список полей
        не установлен, то запрос должен возращать все поля элемента. """

    def limit(self, limit, offset=0):
        """ Установить лимит запроса наподобие SQL инструкции
        LIMIT limit OFFSET offset """

    def geom(self):
        """ Включать геометрию объекта в результат запроса """

    def srs(self, srs):
        """ Установить систему координат геометрии в случае,
        если она включена в запрос """

    def box(self):
        """ Включать охват объекта в результат запроса """


class IFeatureQueryFilter(IFeatureQuery):

    def filter(self, *args):
        """ Установить правила отбора """


class IFeatureQueryFilterBy(IFeatureQuery):

    def filter_by(self, **kwargs):
        """ Установить отбор по значениям аттрибутов """


class IFeatureQueryOrderBy(IFeatureQuery):

    def order_by(self, *args):
        """ Установить порядок сортировки """


class IFeatureQueryLike(IFeatureQuery):

    def like(self, value):
        """ Установить отбор по подстроке """


class IFeatureQueryIntersects(IFeatureQuery):

    def intersects(self, geom):
        """ Установить отбор по пространственному пересечению """
