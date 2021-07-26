# -*- coding: utf-8 -*-
from __future__ import division, unicode_literals, print_function, absolute_import
import logging
import warnings
import six

from .lib.config import ConfigOptions
from .registry import registry_maker
from .package import pkginfo

logger = logging.getLogger(__name__)


class ComponentMeta(type):

    def __init__(cls, name, bases, nmspc):
        super(ComponentMeta, cls).__init__(name, bases, nmspc)
        abstract = getattr(cls, '__abstract__', False)
        if cls.identity and not abstract:
            cls.registry.register(cls)


class Component(six.with_metaclass(ComponentMeta, object)):

    identity = None
    """ Component identifier that should be redefined in a
    child class. Must be syntactically correct python id
    as it is used as attribute name in some cases. """

    registry = registry_maker()

    def __init__(self, env, settings):
        self._env = env

        self._settings = settings
        self._options = ConfigOptions(
            settings, self.option_annotations
            if hasattr(self, 'option_annotations') else ())

        self._logger = logging.getLogger(self.__class__.__module__)

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

    def sys_info(self):
        return []

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
        warnings.warn(
            "Deprecated attribute component.settings, use component.options instead.",
            DeprecationWarning, stacklevel=2)
        return self._settings

    @property
    def options(self):
        return self._options

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


def load_all(packages=None, components=None, enable_disabled=False):
    loaded_packages = list()
    loaded_components = list()

    for pkg in pkginfo.packages:
        if packages is not None and not packages.get(pkg, True):
            if not enable_disabled:
                continue
        
        loaded_packages.append(pkg)
        for comp in pkginfo.pkg_comp(pkg):
            if components is not None and not components.get(
                comp, pkginfo.comp_enabled(comp)
            ):
                if not enable_disabled:
                    continue
            try:
                __import__(pkginfo.comp_mod(comp))
                loaded_components.append(comp)
            except Exception:
                logger.error(
                    "Failed to load component '%s' from module '%s'!",
                    comp, pkginfo.comp_mod(comp))
                raise
    
    return (loaded_packages, loaded_components)
