from __future__ import annotations

import sys
from collections.abc import Mapping
from importlib.util import find_spec
from pathlib import Path
from typing import TYPE_CHECKING, Any, ClassVar, Final, Self

from nextgisweb.lib.config import ConfigOptions, Option
from nextgisweb.lib.i18n import trstr_factory
from nextgisweb.lib.imptool import module_from_stack, module_path
from nextgisweb.lib.logging import logger
from nextgisweb.lib.registry import dict_registry

from .package import pkginfo

if TYPE_CHECKING:
    from .environment import Env


@dict_registry
class Component:
    """Base class for all components in NextGIS Web

    A component must be declared in a module named ``component``. For the main ``nextgisweb``
    package, the component must be placed under ``nextgisweb.<identity>.component``, where
    ``<identity>`` is the component identity.

    NextGIS Web extension packages must be named ``nextgisweb_<extension>``, so the component can be
    declared in one of the following layouts:

    * ``nextgisweb_<identity>.component`` for single-component extension.
    * ``nextgisweb_<extension>.<identity>.component`` for multi-component extension.

    The component class name must end with ``Component``. The remaining class name must match the
    component identity case-insensitively, with underscores in the identity ignored. For example,
    ``foo_bar`` corresponds to ``FooBarComponent``.
    """

    registry: ClassVar[Mapping[str, type[Component]]]
    """Component classes registry"""

    identity: ClassVar[str]
    """Component identity"""

    package: ClassVar[str]
    """Top-level package name, ``nextgisweb`` or ``nextgisweb_<identity>`` or
    ``nextgisweb_<extension>``"""

    module: ClassVar[str]
    """Root module name: ``nextgisweb.<identity>``, or ``nextgisweb_<identity>``, or
    ``nextgisweb_<extension>.<identity>``"""

    root_path: ClassVar[Path]
    """Path to a directory containing :attr:`module`"""

    basename: ClassVar[str]
    """Class name with ``Component`` suffix removed (``CoreComponent`` -> ``Core``)"""

    option_annotations: ClassVar[tuple[Option, ...]] = ()
    """Option annotations of component"""

    def __init_subclass__(cls, **kwargs):
        super().__init_subclass__(**kwargs)

        conv = NamingConventions(cls.__name__, module=cls.__module__)

        for a in ("package", "module", "identity", "basename", "root_path"):
            if hasattr(cls, a):
                raise TypeError(f"{cls.__name__}.{a} class attribute is forbidden")

        cls.package = conv.package
        cls.module = conv.module
        cls.identity = conv.identity
        cls.basename = conv.basename
        cls.root_path = module_path(conv.module)

        from .model import _base

        if hasattr(cls, "metadata"):
            raise TypeError(f"{cls.__name__}.metadata class attribute is forbidden")

        # Autoload model module if it exists
        model_mod_name = f"{cls.module}.model"
        model_mod_exists = model_mod_name in sys.modules or find_spec(model_mod_name)

        if model_mod_exists and model_mod_name not in sys.modules:
            __import__(model_mod_name)

        if memoized := _base.memo.get(cls.identity):
            cls.metadata = memoized.metadata

    def __new__(cls, *args, **kwargs):
        if cls is Component:
            raise TypeError("Component class cannot be instantiated directly")
        return super().__new__(cls)

    def __init__(self, env: Env, settings: Mapping[str, Any]):
        self._env = env
        self._settings = settings
        self._options = ConfigOptions(settings, self.option_annotations)

    @property
    def env(self) -> Env:
        """Environment this component belongs to"""
        return self._env

    @classmethod
    def current(cls) -> Self:
        """Get current component instance from environment"""
        from .environment import env

        return env.components[cls.identity]

    @classmethod
    def resource_path(cls, path: str = ""):
        """Alternative for pkg_resources's resource_filename"""
        return cls.root_path / path

    def initialize(self):
        """First initialization stage."""

    def configure(self):
        """Second initialization stage."""

    def initialize_db(self):
        pass

    def backup_configure(self, config):
        pass

    def backup_objects(self):
        return ()

    def restore_prepare(self):
        pass

    def maintenance(self):
        pass

    def check_integrity(self):
        pass

    def sys_info(self):
        return []

    def setup_pyramid(self, config):
        pass

    def client_codegen(self):
        pass

    def stylesheets(self):
        return ()

    @property
    def options(self):
        return self._options

    @property
    def template_include(self):
        return ()


class NamingConventions:
    """Class to enforce naming conventions for components"""

    def __init__(self, name: str, *, module: str) -> None:
        parts = module.split(".")
        last = parts.pop(-1)
        init = ".".join(parts)
        self.module: Final = init

        if last != "component":
            raise TypeError(f"{name} must be declared in {init}.component module")

        self.package: Final = parts[0]
        if (
            len(parts) < 1
            or len(parts) > 2
            or not (self.package == "nextgisweb" or self.package.startswith("nextgisweb_"))
        ):
            raise TypeError(
                f"{name} expected to be declared under 'nextgisweb' or 'nextgisweb_*' package"
            )

        if len(parts) == 2:
            self.identity: Final = parts[-1]
        elif len(parts) == 1:
            self.identity: Final = self.package[len("nextgisweb_") :]
        else:
            raise NotImplementedError

        logger.debug("Identity '%s' determined from '%s' module.", self.identity, self.module)

        if not name.endswith("Component"):
            raise TypeError(f"{name} must end with 'Component' suffix")
        self.basename: Final = name.removesuffix("Component")

        if self.basename.lower() != self.identity.replace("_", "").lower():
            raise TypeError(f"Class name '{name}' doesn't match '{self.identity}' identity.")


def require(*deps):
    """Decorator for dependencies between components methods

    When applied dependencies are written to private attributes of decorated method. These private
    methods are used in :py:meth:`~nextgisweb.env.Env.chain`.

    :param deps: One or many component identifiers which decorated method execution depends on."""

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
            if components is not None and not components.get(comp, pkginfo.comp_enabled(comp)):
                if not enable_disabled:
                    continue
            try:
                __import__(pkginfo.comp_mod(comp))
                loaded_components.append(comp)
            except Exception:
                logger.error(
                    "Failed to load component '%s' from module '%s'!", comp, pkginfo.comp_mod(comp)
                )
                raise

    return (loaded_packages, loaded_components)


def component_utility(factory):
    memo = {}

    def get(depth=1, *, cident=None):
        if cident is None:
            mod = module_from_stack(depth, ("nextgisweb.env.",))
            cident = pkginfo.component_by_module(mod)
            assert cident is not None

        try:
            return memo[cident]
        except KeyError:
            result = memo[cident] = factory(cident)
            assert result is not None
            return result

    get.memo = memo
    return get


_COMP_ID = component_utility(lambda component_id: component_id)
_tr_str_factory = component_utility(trstr_factory)
