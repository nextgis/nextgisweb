import os
import re
import subprocess
import sys
import threading
import warnings
from collections import defaultdict
from importlib.metadata import metadata

from nextgisweb.lib.imptool import module_path
from nextgisweb.lib.logging import logger

from .compat import entry_points

_version_re = re.compile(r"(.+)\+(?:git)?([0-9a-f]{4,})(\.dirty)?$", re.IGNORECASE)
_qualifications = False


class Package:
    loading = threading.local()

    def __init__(self, entrypoint):
        self._name = entrypoint.dist.name.replace("-", "_")
        self._entrypoint = entrypoint
        self._path = module_path(self.name)

        # Assume a version local part consists of commit id and dirtiness flag.
        self._version_raw = entrypoint.dist.version
        m = _version_re.match(self._version_raw)
        if m is not None:
            self._version = m.group(1)
            self._commit = m.group(2)
            self._dirty = m.group(3) is not None
        else:
            self._version = self._version_raw
            self._commit = None
            self._dirty = None

        self._qualified = False

    @property
    def name(self):
        return self._name

    @property
    def version(self):
        self._qualify()
        return self._version

    @property
    def commit(self):
        self._qualify()
        return self._commit

    @property
    def dirty(self):
        self._qualify()
        return self._dirty

    @property
    def pkginfo(self):
        if hasattr(self, "_pkginfo"):
            return self._pkginfo

        logger.debug(
            "Loading entrypoint: %s = %s",
            self._entrypoint.name,
            self._entrypoint.value,
        )

        mprefix = f"{self.name}."
        mod_before = {k for k in sys.modules.keys() if k.startswith(mprefix)}

        entrypoint_callable = self._entrypoint.load()

        try:
            self.loading.value = self
            self._pkginfo = entrypoint_callable()
        finally:
            delattr(self.loading, "value")

        mod_after = {k for k in sys.modules.keys() if k.startswith(mprefix)}
        mod_loaded = mod_after - mod_before
        if mod_loaded:
            mod_fmt = ", ".join(m[len(self.name) + 1 :] for m in mod_loaded)
            warnings.warn_explicit(
                f"Loading of {self.name} pkginfo entrypoint shouldn't import "
                f"any additional modules, but the following {self.name}.* "
                f"modules were imported: {mod_fmt}.",
                UserWarning,
                sys.modules[self.name].__file__,
                0,
                module=self.name,
            )

        return self._pkginfo

    @property
    def metadata(self):
        if cached := getattr(self, "_metadata", None):
            return cached
        value = metadata(self.name)
        self._metadata = value
        return value

    def _qualify(self):
        if self._qualified or not _qualifications:
            return

        # TODO: Add version qualification!

        commit = git_commit(str(self._path))
        if commit is not None:
            dirty = git_dirty(str(self._path))
            self._commit = commit
            self._dirty = dirty

        self._qualified = True


class PkgInfo:
    def __init__(self):
        self.scanned = False
        self._comp_mod = dict()
        self._comp_enabled = dict()
        self._comp_pkg = dict()
        self._comp_path = dict()
        self._packages = dict()
        self._pkg_comp = dict()

        def _node():
            return defaultdict(_node, {None: None})

        self._module_tree = _node()

    def scan(self):
        if self.scanned:
            return

        epoints = sorted(
            entry_points(group="nextgisweb.packages"),
            # Deterministic order: nextgisweb then others alphabetically
            key=lambda ep: (ep.dist.name != "nextgisweb", ep.dist.name),
        )

        for epoint in epoints:
            package = Package(epoint)
            package_name = package.name
            self._packages[package_name] = package
            components = package.pkginfo.get("components", dict())
            for comp, cdefn in components.items():
                if isinstance(cdefn, str):
                    cdefn = dict(module=cdefn, enabled=True)
                if "enabled" not in cdefn:
                    cdefn["enabled"] = True
                modname = cdefn["module"]

                if existing := self._comp_mod.get(comp):
                    warnings.warn(
                        f"Component '{comp}' was already registered in '{existing}'. "
                        f"Instance from {modname} will be ignored!"
                    )
                    continue

                self._module_tree_insert(modname, comp)

                self._comp_enabled[comp] = cdefn["enabled"]
                self._comp_pkg[comp] = package_name
                self._comp_path[comp] = module_path(modname)
                if package_name not in self._pkg_comp:
                    self._pkg_comp[package_name] = list()
                self._pkg_comp[package_name].append(comp)

        for k, v in self._pkg_comp.items():
            self._pkg_comp[k] = tuple(v)
        self.scanned = True

    @property
    def components(self):
        self.scan()
        return self._comp_mod.keys()

    @property
    def packages(self):
        self.scan()
        return self._packages

    def comp_mod(self, comp):
        self.scan()
        return self._comp_mod[comp]

    def comp_enabled(self, comp):
        self.scan()
        return self._comp_enabled[comp]

    def comp_pkg(self, comp):
        self.scan()
        return self._comp_pkg[comp]

    def comp_path(self, comp):
        self.scan()
        return self._comp_path[comp]

    def pkg_comp(self, pkg):
        self.scan()
        return self._pkg_comp[pkg]

    def component_by_module(self, module_name):
        self.scan()

        n = self._module_tree
        r = module_name
        while True:
            k, __, r = r.partition(".")
            if k in n:
                n = n[k]
            else:
                return n[None]

    def _module_tree_insert(self, module_name, comp):
        self._comp_mod[comp] = module_name

        n = self._module_tree
        r = module_name
        while r:
            k, __, r = r.partition(".")
            n = n[k]
        n[None] = comp


pkginfo = PkgInfo()


def enable_qualifications(enabled):
    global _qualifications
    _qualifications = enabled


def git_commit(path):
    try:
        devnull = open(os.devnull, "w")
        commit = subprocess.check_output(
            ["git", "rev-parse", "--short=8", "HEAD"],
            cwd=path,
            universal_newlines=True,
            stderr=devnull,
        )
    except Exception as exc:
        if isinstance(exc, subprocess.CalledProcessError) and exc.returncode == 128:
            pass  # Not a git repository
        else:
            logger.error("Failed to get git commit hash in '%s'", path)
        return None
    finally:
        devnull.close()
    return commit.rstrip()


def git_dirty(path):
    try:
        devnull = open(os.devnull, "w")
        return (
            subprocess.call(
                ["git", "diff", "--no-ext-diff", "--quiet"],
                cwd=path,
                universal_newlines=True,
                stderr=devnull,
            )
            != 0
        )
    except Exception as exc:
        if isinstance(exc, subprocess.CalledProcessError) and exc.returncode == 128:
            pass  # Not a git repository
        else:
            logger.error("Failed to get git dirty flag in '%s'", path)
        return None
    finally:
        devnull.close()


def single_component():
    package = Package.loading.value.name
    prefix = "nextgisweb_"
    assert package.startswith(prefix), "Package name must start with {prefix}"
    component = package[len(prefix) :]
    return dict(components={component: package})
