import os
import pkg_resources
import subprocess
import re
import importlib
from importlib.metadata import metadata

from pathlib import Path

from .lib.logging import logger

_version_re = re.compile(r'(.+)\+(?:git)?([0-9a-f]{4,})(\.dirty)?$', re.IGNORECASE)
_qualifications = False


def amd_packages():
    if hasattr(amd_packages, 'cached_result'):
        return list(amd_packages.cached_result)

    result = []
    for ep in pkg_resources.iter_entry_points(group='nextgisweb.amd_packages'):
        result.extend(ep.resolve()())

    amd_packages.cached_result = tuple(result)
    return result


class Package(object):

    def __init__(self, entrypoint):
        self._name = entrypoint.dist.key.replace('-', '_')
        self._entrypoint = entrypoint

        spec = importlib.util.find_spec(self.name)
        pathname = spec.submodule_search_locations[0]
        self._path = Path(pathname)

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
        if hasattr(self, '_pkginfo'):
            return self._pkginfo

        logger.debug(
            "Loading entrypoint '%s:%s'...",
            self._entrypoint.module_name,
            ','.join(self._entrypoint.attrs))

        self._pkginfo = self._entrypoint.resolve()()
        return self._pkginfo

    @property
    def metadata(self):
        if cached := getattr(self, '_metadata', None):
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


class PkgInfo(object):

    def __init__(self):
        self.scanned = False
        self._mod_comp = dict()
        self._comp_mod = dict()
        self._comp_enabled = dict()
        self._comp_pkg = dict()
        self._packages = dict()
        self._pkg_comp = dict()

    def scan(self):
        if self.scanned:
            return

        epoints = pkg_resources.iter_entry_points(group='nextgisweb.packages')
        for epoint in epoints:
            package = Package(epoint)
            package_name = package.name
            self._packages[package_name] = package
            components = package.pkginfo.get('components', dict())
            for (comp, cdefn) in components.items():
                if isinstance(cdefn, str):
                    cdefn = dict(module=cdefn, enabled=True)
                if 'enabled' not in cdefn:
                    cdefn['enabled'] = True
                modname = cdefn['module']

                self._mod_comp[modname] = comp
                self._comp_mod[comp] = modname
                self._comp_enabled[comp] = cdefn['enabled']
                self._comp_pkg[comp] = package_name
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

    def pkg_comp(self, pkg):
        self.scan()
        return self._pkg_comp[pkg]


pkginfo = PkgInfo()


def enable_qualifications(enabled):
    global _qualifications
    _qualifications = enabled


def git_commit(path):
    try:
        devnull = open(os.devnull, 'w')
        commit = subprocess.check_output(
            ['git', 'rev-parse', '--short=8', 'HEAD'],
            cwd=path, universal_newlines=True, stderr=devnull)
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
        devnull = open(os.devnull, 'w')
        return subprocess.call(
            ['git', 'diff', '--no-ext-diff', '--quiet'],
            cwd=path, universal_newlines=True, stderr=devnull
        ) != 0
    except Exception as exc:
        if isinstance(exc, subprocess.CalledProcessError) and exc.returncode == 128:
            pass  # Not a git repository
        else:
            logger.error("Failed to get git dirty flag in '%s'", path)
        return None
    finally:
        devnull.close()
