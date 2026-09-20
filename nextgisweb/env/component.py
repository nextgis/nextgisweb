from __future__ import annotations

import sys
from collections.abc import Callable, Mapping
from importlib.util import find_spec
from pathlib import Path
from typing import (
    TYPE_CHECKING,
    Any,
    ClassVar,
    Final,
    Protocol,
    Self,
    assert_type,
    cast,
    no_type_check,
)

from nextgisweb.lib.config import ConfigOptions, Option
from nextgisweb.lib.i18n import trstr_factory
from nextgisweb.lib.imptool import module_from_stack, module_path
from nextgisweb.lib.logging import logger
from nextgisweb.lib.registry import DictRegistry

from .package import pkginfo

if TYPE_CHECKING:
    from .environment import Env


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

    registry: ClassVar[DictRegistry[type[Component]]] = DictRegistry()
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

    def __init_subclass__(cls, *, mixin: bool = False, **kwargs):
        super().__init_subclass__(**kwargs)

        if mixin:
            return

        conv = NamingConventions(cls.__name__, module=cls.__module__)

        for a in (
            "basename",
            "configure",
            "identity",
            "metadata",
            "module",
            "package",
            "root_path",
        ):
            if hasattr(cls, a):
                raise TypeError(f"{cls.__name__}.{a} class attribute is forbidden")

        for a in (
            "backup_configure",
            "backup_objects",
            "check_integrity",
            "client_codegen",
            "healthcheck",
            "is_service_ready",
            "maintenance",
            "query_stat",
            "restore_prepare",
            "stylesheets",
            "sys_info",
            "template_include",
        ):
            if hasattr(cls, a):
                raise TypeError(f"Migrate {cls.__name__}.{a} to component hooks")

        cls.package = conv.package
        cls.module = conv.module
        cls.identity = conv.identity
        cls.basename = conv.basename
        cls.root_path = module_path(conv.module)

        cls.registry.register(cls)

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

        result = env.components[cls.identity]
        assert_type(result, Component)
        result = cast(Self, result)
        return result

    @classmethod
    def resource_path(cls, path: str = ""):
        """Alternative for pkg_resources's resource_filename"""
        return cls.root_path / path

    def initialize(self):
        pass

    def initialize_db(self):
        pass

    def setup_pyramid(self, config):
        pass

    @property
    def options(self):
        return self._options

    @classmethod
    def _autoload_model(cls) -> None:
        from .model import _base

        model_mod_name = f"{cls.module}.model"
        if model_mod_name not in sys.modules and find_spec(model_mod_name):
            __import__(model_mod_name)

        if (memoized := _base.memo.get(cls.identity)) is not None:
            cls.metadata = memoized.metadata

        # Replace _autoload_model with a no-op to prevent evaluating it again
        cls._autoload_model = staticmethod(lambda: None)  # ty: ignore[invalid-assignment]


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


@no_type_check  # Migrating to component hooks
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


class ComponentUtility[T](Protocol):
    memo: dict[str, T]

    def __call__(self, depth: int = 1, *, cident: str | None = None) -> T: ...


def component_utility[T](factory: Callable[[str], T]) -> ComponentUtility[T]:
    memo: dict[str, T] = {}

    def get(depth: int = 1, *, cident: str | None = None) -> T:
        if cident is None:
            mod = module_from_stack(depth, ("nextgisweb.env.",))
            cident = pkginfo.component_by_module(mod, required=True)

        try:
            return memo[cident]
        except KeyError:
            result = factory(cident)
            assert result is not None
            memo[cident] = result
            return result

    utility = cast(ComponentUtility[T], get)
    utility.memo = memo
    return utility


_COMP_ID = component_utility(lambda component_id: component_id)
_tr_str_factory = component_utility(trstr_factory)
