import warnings
from pathlib import Path
from pkg_resources import resource_filename
from typing import Callable

from ..lib.config import ConfigOptions
from ..lib.logging import logger
from ..lib.registry import dict_registry
from .package import pkginfo, module_path


class ComponentMeta(type):

    def __init__(cls, name, bases, nmspc):
        super().__init__(name, bases, nmspc)

        module = cls.__module__
        module_parts = module.split('.')
        if module_parts[-1] == 'component':
            module_parts.pop(-1)

        cls.package = module_parts[0]
        cls.module = '.'.join(module_parts)
        cls.root_path = module_path(cls.module)
        cls.resource_path = ComponentMeta._resource_path_factory(cls.module)

    @classmethod
    def _resource_path_factory(cls, module):
        parts = module.split('.')
        package = parts.pop(0)

        def _resource_path(cls, path: str) -> Path:
            return Path(resource_filename(package, '/'.join(parts + [path, ])))

        return classmethod(_resource_path)


@dict_registry
class Component(metaclass=ComponentMeta):

    identity = None
    """Identifier redefined in successors"""

    package: str
    """Top-level package name, usually 'nextgisweb' or 'nextgisweb_*'"""

    module: str
    """Root module name, usually {package}.{identity} or {package} for
    single-component packages"""

    root_path: Path
    """Path to a directory containing {module}"""

    resource_path: Callable[[str], Path]
    """Shortcut for pkg_resources.resource_filename()"""

    def __init__(self, env, settings):
        self._env = env

        self._settings = settings
        self._options = ConfigOptions(
            settings, self.option_annotations
            if hasattr(self, 'option_annotations') else ())

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

    def check_integrity(self):
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
    def template_include(self):
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
