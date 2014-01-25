# -*- coding: utf-8 -*-
import pkg_resources
from .registry import registry_maker


class Component(object):

    registry = registry_maker()

    def __init__(self, env, settings):
        self._env = env
        self._settings = settings

    def initialize(self):
        pass

    def initialize_db(self):
        pass

    def setup_pyramid(self, config):
        pass

    @property
    def env(self):
        return self._env

    @property
    def settings(self):
        return self._settings

    @classmethod
    def setup_routes(cls, dbsession):
        pass


def require(*comp_ident):

    def subdecorator(defn):
    
        def wrapper(*args, **kwargs):
            return defn(*args, **kwargs)
        
        wrapper._require = comp_ident
        
        return wrapper

    return subdecorator


def load_all(packages_ignore=None, components_ignore=None):
    if packages_ignore is None:
        packages_ignore = ()

    if components_ignore is None:
        components_ignore = ()

    for ep in pkg_resources.iter_entry_points(group='nextgisweb.component'):
        if ep.name not in components_ignore:
            ep.load()

    for ep in pkg_resources.iter_entry_points(group='nextgisweb.packages'):
        if ep.name not in packages_ignore:
            pkginfo = ep.load()()
            for component, module_name in pkginfo['components'].iteritems():
                if component not in components_ignore:
                    __import__(module_name)
