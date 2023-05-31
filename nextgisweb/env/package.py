import os
import re
import subprocess
import warnings
from importlib.metadata import metadata
from importlib.util import find_spec
from pathlib import Path

from pkg_resources import iter_entry_points, resource_filename

from ..lib.logging import logger


_version_re = re.compile(r'(.+)\+(?:git)?([0-9a-f]{4,})(\.dirty)?$', re.IGNORECASE)
_qualifications = False


def amd_packages():
    if hasattr(amd_packages, 'cached_result'):
        return list(amd_packages.cached_result)

    result = list(pkginfo.amd_packages())
    for ep in iter_entry_points(group='nextgisweb.amd_packages'):
        ep_resolved = ep.resolve()
        for t in ep_resolved():
            if t not in result:
                result.append(t)
            else:
                warnings.warn(
                    f"AMD package '{t[0]}' is reported by {ep.name} but it was "
                    f"already auto-registered due to changes in 4.4.0.dev8.")

    amd_packages.cached_result = tuple(result)
    return result


def module_path(module_name: str) -> Path:
    spec = find_spec(module_name)
    assert len(spec.submodule_search_locations) == 1
    return Path(spec.submodule_search_locations[0])


class Package:

    def __init__(self, entrypoint):
        self._name = entrypoint.dist.key.replace('-', '_')
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


class PkgInfo:

    def __init__(self):
        self.scanned = False
        self._mod_comp = dict()
        self._comp_mod = dict()
        self._comp_enabled = dict()
        self._comp_pkg = dict()
        self._comp_path = dict()
        self._packages = dict()
        self._pkg_comp = dict()
        self._pkg_amd = list()

    def scan(self):
        if self.scanned:
            return

        epoints = iter_entry_points(group='nextgisweb.packages')
        for epoint in epoints:
            package = Package(epoint)
            package_name = package.name
            self._packages[package_name] = package
            self._pkg_amd.extend(package.pkginfo.get('amd_packages', []))
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
                self._comp_path[comp] = module_path(modname)
                if package_name not in self._pkg_comp:
                    self._pkg_comp[package_name] = list()
                self._pkg_comp[package_name].append(comp)

        for k, v in self._pkg_comp.items():
            self._pkg_comp[k] = tuple(v)

        self.scanned = True
        self.amd_packages()

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
    
    def amd_packages(self):
        cached = getattr(self, '_amd_packages', None)
        if cached is not None:
            return cached

        self.scan()

        result = list(self._pkg_amd)
        for modname in self._mod_comp:
            parts = modname.split('.')
            pkg = parts[0]
            rest = parts[1:] + ['amd']
            ap = Path(resource_filename(pkg, '/'.join(rest)))
            if not ap.is_dir():
                continue
            for sub in ap.iterdir():
                if sub.is_dir():
                    sn = sub.name
                    result.append((sn, f'{pkg}:' + '/'.join(rest + [sn])))

        self._amd_packages = result
        return result


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
