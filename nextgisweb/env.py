# -*- coding: utf-8 -*-

from .component import Component, load_all

class Env(object):

    def __init__(self, cfg):
        load_all()
        self._components = dict()

        for comp_class in Component.registry:
            identity = comp_class.identity
            settings = dict(cfg.items(identity) if cfg.has_section(identity) else ())
            instance = comp_class(env=self, settings=settings)
            self._components[comp_class.identity] = instance

            assert not hasattr(self, identity), "Attribute name %s already used" % identity
            setattr(self, identity, instance)

    def initialize(self):
        for c in self._components.itervalues():
            c.initialize()
