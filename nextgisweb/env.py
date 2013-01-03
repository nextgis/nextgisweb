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

    def chain(self, method):
        seq = ['core', ]

        def traverse(components):
            for c in components:
                if not c.identity in traverse.seq:
                    if hasattr(getattr(c, method), '_require'):
                        traverse([self._components[i] for i in getattr(c, method)._require])
                    traverse.seq.append(c.identity)

        traverse.seq = seq
        traverse(self._components.itervalues())

        return [self._components[i] for i in traverse.seq]

    def initialize(self):
        seq = list(self.chain('initialize'))

        for c in seq:
            c.initialize()
