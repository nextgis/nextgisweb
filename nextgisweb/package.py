# -*- coding: utf-8 -*-
from __future__ import unicode_literals, print_function, absolute_import
import pkg_resources
import six


def amd_packages():
    if hasattr(amd_packages, 'cached_result'):
        return list(amd_packages.cached_result)

    result = []
    for ep in pkg_resources.iter_entry_points(group='nextgisweb.amd_packages'):
        result.extend(ep.load()())

    amd_packages.cached_result = tuple(result)
    return result


class PkgInfo(object):

    def __init__(self):
        self.scanned = False
        self._mod_comp = dict()
        self._comp_mod = dict()
        self._comp_pkg = dict()
        self._pkg_comp = dict()
        self._pkg_vers = dict()

    def scan(self):
        if self.scanned:
            return

        epoints = pkg_resources.iter_entry_points(group='nextgisweb.packages')
        for epoint in epoints:
            pkginfo = epoint.load()()
            components = pkginfo.get('components', dict())
            for (comp, modname) in components.items():
                package = modname.split('.')[0]
                self._mod_comp[modname] = comp
                self._comp_mod[comp] = modname
                self._comp_pkg[comp] = package
                if package not in self._pkg_comp:
                    self._pkg_comp[package] = list()
                    self._pkg_vers[package] = pkg_resources \
                        .get_distribution(package).version
                self._pkg_comp[package].append(comp)

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
        return self._pkg_comp.keys()

    def comp_mod(self, comp):
        self.scan()
        return self._comp_mod[comp]

    def comp_pkg(self, comp):
        self.scan()
        return self._comp_pkg[comp]

    def pkg_comp(self, pkg):
        self.scan()
        return self._pkg_comp[pkg]

    def pkg_version(self, pkg):
        self.scan()
        return self._pkg_vers[pkg]


pkginfo = PkgInfo()
