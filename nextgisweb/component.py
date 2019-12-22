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
    """ Component identifier that should be redefined in a
    child class. Must be syntactically correct python id
    as it is used as attribute name in some cases. """

    registry = registry_maker()

    def __init__(self, env, settings):
        self._env = env
        self._settings = settings
        self._logger = logging.getLogger('nextgisweb.comp.' + self.identity)

    def initialize(self):
        """ First initialization stage. """

    def configure(self):
        """ Second initialization stage. """

    def initialize_db(self):
        pass

    def backup_configure(self, config):
        pass

    def backup_objects(self):
        return ()

    def maintenance(self):
        pass

    def setup_pyramid(self, config):
        pass

    @property
    def env(self):
        """ Environment this component belongs too. Set 
        on class exemplar creation and not changed afterwards.
        This attribute should be used instead of global environment
        :py:class:`~nextgisweb.env.env`. """

        return self._env

    @property
    def settings(self):
        return self._settings

    @property
    def logger(self):
        return self._logger

    @property
    def amd_base(self):
        """
        Список вспомогательных AMD модулей, предоставляемых компонентом,
        которые будут использованы в базовом шаблоне страницы. Могут
        быть использованы для изменения её внешнего вида.
        """
        return ()


def require(*deps):
    """ Decorator for dependencies between components methods.
    When applied dependencies are written to private attributes of decorated
    method. These private methods are used in
    :py:meth:`~nextgisweb.env.Env.chain`.

    :param deps: One or many component identifiers which decorated method
        execution depends on. """

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
