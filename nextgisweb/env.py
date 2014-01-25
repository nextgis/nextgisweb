# -*- coding: utf-8 -*-
import re

from .component import Component, load_all


class Env(object):

    def __init__(self, cfg):
        cs = dict(cfg.items('core') if cfg.has_section('core') else ())

        packages_ign = re.split(r'[,\s]+', cs.get('packages.ignore', ''))
        components_ign = re.split(r'[,\s]+', cs.get('components.ignore', ''))

        load_all(
            packages_ignore=packages_ign,
            components_ignore=components_ign
        )

        self._components = dict()

        for comp_class in Component.registry:
            identity = comp_class.identity
            
            if identity not in components_ign:
                settings = dict(
                    cfg.items(identity)
                    if cfg.has_section(identity)
                    else ())

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
