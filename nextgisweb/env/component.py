import sys
from importlib.util import find_spec
from pathlib import Path
from typing import ClassVar, Mapping, Type
from warnings import warn

from nextgisweb.lib.config import ConfigOptions
from nextgisweb.lib.i18n import trstr_factory
from nextgisweb.lib.imptool import module_from_stack, module_path
from nextgisweb.lib.logging import logger
from nextgisweb.lib.registry import dict_registry

from .package import pkginfo


class ComponentMeta(type):
    def __new__(mcls, name, bases, nmspc):
        module = nmspc["__module__"]
        module_parts = module.split(".")

        last_part = module_parts.pop(-1)
        nmspc["module"] = module_init = ".".join(module_parts)
        assert last_part == "component", f"{name} must be declared in {module_init}.component"
        assert 1 <= len(module_parts) <= 2

        nmspc["package"] = package = module_parts[0]
        assert package == "nextgisweb" or package.startswith("nextgisweb_")

        nmspc["root_path"] = module_path(module_init)

        # Skip Component base class from processing
        if bases != ():
            # Determine the identity from module name
            if len(module_parts) == 2:
                auto_identity = module_parts[-1]
            elif len(module_parts) == 1:
                auto_identity = package[len("nextgisweb_") :]
            else:
                assert False

            logger.debug("Identity '%s' determined from '%s' module.", auto_identity, module)

            identity = nmspc.get("identity")
            assert identity is None or identity == auto_identity

            if identity is None:
                nmspc["identity"] = identity = auto_identity
            else:
                assert identity == auto_identity
                warn(
                    f"{name}.identity definition can be removed starting from "
                    f"nextgisweb >= 4.5.0.dev7.",
                    DeprecationWarning,
                    2,
                )

            assert (
                name.lower() == identity.replace("_", "").lower() + "component"
            ), f"Class name '{name}' doesn't match the '{identity}' identity."
            nmspc["basename"] = name[: -len("Component")]

        return super().__new__(mcls, name, bases, nmspc)

    def __init__(cls: Type["Component"], name, bases, nmspc):
        super().__init__(name, bases, nmspc)

        # Skip Component base class from processing
        if bases == ():
            return

        from .model import _base

        metadata = getattr(cls, "metadata", None)
        if metadata is not None:
            memoized = _base.memo.get(cls.identity)
            assert memoized is not None
            assert memoized.metadata is metadata
            warn(
                f"{name}.metadata definition can be removed starting from "
                f"nextgisweb >= 4.5.0.dev6.",
                DeprecationWarning,
                2,
            )
        else:
            # TODO: Switch to upcoming component module slots
            model_mod_name = f"{cls.module}.model"
            if model_mod_name not in sys.modules and find_spec(model_mod_name):
                __import__(model_mod_name)

            if memoized := _base.memo.get(cls.identity):
                cls.metadata = memoized.metadata


@dict_registry
class Component(metaclass=ComponentMeta):
    registry: ClassVar[Mapping[str, Type["Component"]]]
    """Component classes registry"""

    identity: ClassVar[str]
    """Identifier redefined in successors"""

    package: ClassVar[str]
    """Top-level package name, usually 'nextgisweb' or 'nextgisweb_*'"""

    module: ClassVar[str]
    """Root module name: {package}.{identity} for multi-component and {package}
    for single-component packages"""

    root_path: ClassVar[Path]
    """Path to a directory containing {module}"""

    basename: ClassVar[str]
    """Class name with 'Component' suffix removed (CoreComponent -> Core)"""

    def __init__(self, env, settings):
        self._env = env

        self._settings = settings
        self._options = ConfigOptions(settings, getattr(self, "option_annotations", ()))

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
    def env(self):
        """Environment this component belongs too. Set
        on class exemplar creation and not changed afterwards.
        This attribute should be used instead of global environment
        :py:class:`~nextgisweb.env.env`."""

        return self._env

    @property
    def options(self):
        return self._options

    @property
    def template_include(self):
        return ()


def require(*deps):
    """Decorator for dependencies between components methods.
    When applied dependencies are written to private attributes of decorated
    method. These private methods are used in
    :py:meth:`~nextgisweb.env.Env.chain`.

    :param deps: One or many component identifiers which decorated method
        execution depends on."""

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

    def get(depth=1):
        mod = module_from_stack(depth, ("nextgisweb.env.",))
        component_id = pkginfo.component_by_module(mod)

        try:
            return memo[component_id]
        except KeyError:
            result = memo[component_id] = factory(component_id)
            return result

    get.memo = memo
    return get


_COMP_ID = component_utility(lambda component_id: component_id)
_tr_str_factory = component_utility(trstr_factory)
