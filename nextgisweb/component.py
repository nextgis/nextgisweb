# -*- coding: utf-8 -*-
from __future__ import unicode_literals, print_function, absolute_import
import logging

from .registry import registry_maker
from .package import pkginfo


class ComponentMeta(type):

    def __init__(cls, name, bases, nmspc):
        super(ComponentMeta, cls).__init__(name, bases, nmspc)
        abstract = getattr(cls, '__abstract__', False)
        if cls.identity and not abstract:
            cls.registry.register(cls)


class Component(object):
    __metaclass__ = ComponentMeta

    identity = None
    """ Идентификатор компонента, который должен быть переопределен в дочернем
    классе. Должен быть синтаксически корректным идентификатором python,
    поскольку в ряде случаев используется как имя атрибута. """

    registry = registry_maker()

    def __init__(self, env, settings):
        self._env = env
        self._settings = settings
        self._logger = logging.getLogger('nextgisweb.comp.' + self.identity)

    def initialize(self):
        """ Первая стадия инициализации. """

    def configure(self):
        """ Вторая стадия инициализации. """

    def initialize_db(self):
        pass

    def backup(self):
        return ()

    def setup_pyramid(self, config):
        pass

    @property
    def env(self):
        """ Окружение к которому относится этот компонент. Устанавливается при
        создании экземпляра класса компонента и в дальнейшем не меняется. По
        этот атрбут следует использовать вместо глобального окружения
        :py:class:`~nextgisweb.env.env`. """

        return self._env

    @property
    def settings(self):
        return self._settings

    @property
    def logger(self):
        return self._logger


def require(*deps):
    """ Декоратор для указания зависимостей между методами компонентов.
    В результате приминения зависимости записываюстся в приватные атрибуты
    декорируемого метода. Эти приватные методы используются в
    :py:meth:`~nextgisweb.env.Env.chain`.

    :param deps: Один или несколько идентификаторов компонентов, от
        которых зависит выполнение декорируемого метода. """

    def subdecorator(defn):

        def wrapper(*args, **kwargs):
            return defn(*args, **kwargs)

        wrapper._require = deps

        return wrapper

    return subdecorator


def load_all(packages_ignore=None, components_ignore=None):
    if packages_ignore is None:
        packages_ignore = ()
    if components_ignore is None:
        components_ignore = ()

    for pkg in pkginfo.packages:
        if pkg in packages_ignore:
            continue
        for comp in pkginfo.pkg_comp(pkg):
            if comp in components_ignore:
                continue
            __import__(pkginfo.comp_mod(comp))
