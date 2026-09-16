from __future__ import annotations

import re
import sys
import threading
from collections.abc import Callable, Iterable, Mapping
from dataclasses import dataclass, field
from functools import cached_property, wraps
from importlib.metadata import EntryPoint, PackageMetadata, entry_points, metadata
from pathlib import Path
from typing import ClassVar, Concatenate, Literal, TypedDict, overload
from warnings import warn, warn_explicit

from typing_extensions import ReadOnly

from nextgisweb.lib.imptool import module_path
from nextgisweb.lib.logging import logger

from .git_info import git_info

_version_re = re.compile(r"(.+)\+(?:git)?([0-9a-f]{4,})(\.dirty)?$", re.IGNORECASE)
_qualifications = False


class PackageComp(TypedDict):
    module: ReadOnly[str]
    enabled: ReadOnly[bool]


class PackageInfo(TypedDict):
    components: ReadOnly[Mapping[str, PackageComp]]


def ensure_qualified[**P, R](
    func: Callable[Concatenate[Package, P], R],
) -> Callable[Concatenate[Package, P], R]:
    @wraps(func)
    def wrapper(self: Package, *args: P.args, **kwargs: P.kwargs) -> R:
        if not self._qualified:
            self._qualify()
            self._qualified = True
        return func(self, *args, **kwargs)

    return wrapper


class Package:
    loading: ClassVar = threading.local()

    def __init__(self, epoint: EntryPoint) -> None:
        assert epoint.dist is not None, "EntryPoint without distribution"

        self._name = epoint.dist.name.replace("-", "_")
        self._epoint = epoint
        self._path = module_path(self.name)

        # Assume a version local part consists of commit id and dirtiness flag.
        self._version_raw = epoint.dist.version
        if (m := _version_re.match(self._version_raw)) is not None:
            self._version = m.group(1)
            self._commit = m.group(2)
            self._dirty = m.group(3) is not None
        else:
            self._version = self._version_raw
            self._commit = None
            self._dirty = None

        self._qualified = False

    @property
    def name(self) -> str:
        return self._name

    @property
    @ensure_qualified
    def version(self) -> str:
        return self._version

    @property
    @ensure_qualified
    def commit(self) -> str | None:
        return self._commit

    @property
    @ensure_qualified
    def dirty(self) -> bool | None:
        return self._dirty

    @cached_property
    def pkginfo(self) -> PackageInfo:
        logger.debug(
            "Loading entrypoint: %s = %s",
            self._epoint.name,
            self._epoint.value,
        )

        mprefix = f"{self.name}."

        ep_callable = self._epoint.load()

        mod_before = {k for k in sys.modules.keys() if k.startswith(mprefix)}
        try:
            self.loading.value = self
            ep_result = ep_callable()
        finally:
            delattr(self.loading, "value")
        mod_after = {k for k in sys.modules.keys() if k.startswith(mprefix)}

        if mod_loaded := mod_after - mod_before:
            mod_fmt = ", ".join(m[len(self.name) + 1 :] for m in mod_loaded)
            mod_filename = sys.modules[self.name].__file__ or "<unknown>"
            warn_explicit(
                f"Loading of {self.name} pkginfo entrypoint shouldn't import "
                f"any additional modules, but the following {self.name}.* "
                f"modules were imported: {mod_fmt}.",
                category=UserWarning,
                filename=mod_filename,
                lineno=0,
                module=self.name,
            )

        if (
            not isinstance(ep_result, dict)
            or (set(ep_result.keys()) != {"components"})
            or not isinstance(ep_components := ep_result["components"], dict)
        ):
            raise TypeError(f"Invalid package info structure: {ep_result!r}")

        components: dict[str, PackageComp] = {}
        for k, v in ep_components.items():
            if not isinstance(k, str) or not isinstance(v, (dict, str)):
                raise TypeError(f"Invalid package info structure: {ep_result!r}")
            if isinstance(v, str):
                module, enabled = (v, True)
            elif not isinstance(module := v.get("module"), str) or not isinstance(
                enabled := v.get("enabled", True), bool
            ):
                raise TypeError(f"Invalid package info structure: {ep_result!r}")
            components[k] = {"module": module, "enabled": enabled}

        return PackageInfo(components=components)

    @cached_property
    def metadata(self) -> PackageMetadata:
        return metadata(self.name)

    def _qualify(self) -> None:
        if self._qualified or not _qualifications:
            return

        if gi := git_info(self._path):
            self._commit = gi.commit[:8]
            self._dirty = gi.dirty

        self._qualified = True


@dataclass
class ModuleNode:
    cident: str | None = None
    children: dict[str, ModuleNode] = field(default_factory=dict)


class ModuleTree:
    def __init__(self) -> None:
        self._root = ModuleNode()

    def insert(self, module: str, cident: str) -> None:
        node = self._root
        for part in module.split("."):
            node = node.children.setdefault(part, ModuleNode())
        node.cident = cident

    def lookup(self, module: str) -> str | None:
        node = self._root
        result = node.cident

        for part in module.split("."):
            child = node.children.get(part)
            if child is None:
                break

            node = child
            if node.cident is not None:
                result = node.cident

        return result


def ensure_scanned[**P, R](
    func: Callable[Concatenate[PkgInfo, P], R],
) -> Callable[Concatenate[PkgInfo, P], R]:
    @wraps(func)
    def wrapper(self: PkgInfo, *args: P.args, **kwargs: P.kwargs) -> R:
        if not self._scanned:
            self._scan()
            self._scanned = True
        return func(self, *args, **kwargs)

    return wrapper


class PkgInfo:
    def __init__(self) -> None:
        self._module_tree = ModuleTree()
        self._scanned = False

        self._comp_mod: dict[str, str] = {}
        self._comp_enabled: dict[str, bool] = {}
        self._comp_pkg: dict[str, str] = {}
        self._comp_path: dict[str, Path] = {}
        self._packages: dict[str, Package] = {}
        self._pkg_comp: dict[str, tuple[str, ...]] = {}

    @property
    @ensure_scanned
    def components(self) -> Iterable[str]:
        """All registered component identities"""
        return self._comp_mod.keys()

    @property
    @ensure_scanned
    def packages(self) -> Mapping[str, Package]:
        """All packages metadata"""
        return self._packages

    @ensure_scanned
    def comp_mod(self, cident: str) -> str:
        """Get the module name for the given component"""
        return self._comp_mod[cident]

    @ensure_scanned
    def comp_enabled(self, cident: str) -> bool:
        """Check if the given component is enabled"""
        return self._comp_enabled[cident]

    @ensure_scanned
    def comp_pkg(self, cident: str) -> str:
        """Get the package name for the given component"""
        return self._comp_pkg[cident]

    @ensure_scanned
    def comp_path(self, cident: str) -> Path:
        """Get the filesystem path for the given component"""
        return self._comp_path[cident]

    @ensure_scanned
    def pkg_comp(self, pkg: str) -> Iterable[str]:
        """Get all component identities for the given package"""
        return self._pkg_comp[pkg]

    @overload
    def component_by_module(self, /, module: str, *, required: Literal[True]) -> str: ...

    @overload
    def component_by_module(self, /, module: str) -> str | None: ...

    @ensure_scanned
    def component_by_module(self, module: str, *, required: bool = False) -> str | None:
        """Get the component identity for the given module name"""
        result = self._module_tree.lookup(module)
        if result is None and required:
            raise KeyError(f"Component for module `{module}` not found")
        return result

    def _scan(self) -> None:
        """Load `nextgisweb.packages` entry points and collect package and component information"""

        def _epoint_sort_key(ep: EntryPoint) -> tuple[int, str]:
            assert ep.dist is not None, "Entry point without distribution"
            return (0 if ep.dist.name == "nextgisweb" else 1, ep.dist.name)

        # Deterministic order: nextgisweb then others alphabetically
        epoints = sorted(entry_points(group="nextgisweb.packages"), key=_epoint_sort_key)

        for epoint in epoints:
            package = Package(epoint)
            self._packages[package.name] = package
            for cident, cdefn in package.pkginfo["components"].items():
                module = cdefn["module"]

                if existing := self._comp_mod.get(cident):
                    warn(
                        f"Component `{cident}` was already registered in `{existing}`. "
                        f"Instance from `{module}` will be ignored!"
                    )
                    continue

                self._comp_mod[cident] = module
                self._module_tree.insert(module, cident)

                self._comp_enabled[cident] = cdefn["enabled"]
                self._comp_pkg[cident] = package.name
                self._comp_path[cident] = module_path(module)

                package_components = self._pkg_comp.get(package.name, ())
                self._pkg_comp[package.name] = (*package_components, cident)


pkginfo = PkgInfo()


def enable_qualifications(enabled: bool) -> None:
    global _qualifications
    _qualifications = enabled


def single_component() -> dict:
    package = Package.loading.value.name
    prefix = "nextgisweb_"
    assert package.startswith(prefix), f"Package name must start with {prefix}"
    component = package[len(prefix) :]
    return dict(components={component: package})
