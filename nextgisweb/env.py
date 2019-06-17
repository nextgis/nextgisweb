# -*- coding: utf-8 -*-
from __future__ import unicode_literals, print_function, absolute_import
import os
import re
import codecs
from ConfigParser import RawConfigParser

import sqlalchemy as sa

from .component import Component, load_all
from .package import pkginfo


class Env(object):

    def __init__(self, cfg=None):
        if cfg is None:
            cfg = RawConfigParser()
            cfg.readfp(codecs.open(os.environ.get('NEXTGISWEB_CONFIG'), 'r', 'utf-8'))

            for section in cfg.sections():
                for item, value in cfg.items(section):
                    cfg.set(section, item, value % os.environ)

        cs = dict(cfg.items('core') if cfg.has_section('core') else ())

        packages_ign = re.split(r'[,\s]+', cs.get('packages.ignore', ''))
        components_ign = re.split(r'[,\s]+', cs.get('components.ignore', ''))

        load_all(
            packages_ignore=packages_ign,
            components_ignore=components_ign)

        self._components = dict()

        for comp_class in Component.registry:
            identity = comp_class.identity

            if pkginfo.comp_pkg(identity) in packages_ign:
                continue
            if identity in components_ign:
                continue

            settings = dict(
                cfg.items(identity)
                if cfg.has_section(identity)
                else ())

            instance = comp_class(env=self, settings=settings)
            self._components[comp_class.identity] = instance

            assert not hasattr(self, identity), \
                "Attribute name %s already used" % identity

            setattr(self, identity, instance)

    def chain(self, meth):
        """ Building a sequence of method calls with dependencies.
        ``core`` component dependency gets added automatically for all
        components, so that it is returned first.

        :param meth: Name of the method to build sequence for. """

        seq = ['core', ]

        def traverse(components):
            for c in components:
                if c.identity not in traverse.seq:
                    if hasattr(getattr(c, meth), '_require'):
                        traverse([self._components[i] for i in getattr(
                            c, meth)._require])
                    traverse.seq.append(c.identity)

        traverse.seq = seq
        traverse(self._components.itervalues())

        return [self._components[i] for i in traverse.seq]

    def initialize(self):
        for c in list(self.chain('initialize')):
            c.initialize()

            if hasattr(c, 'metadata'):
                c.metadata.bind = self.core.engine

        for c in list(self.chain('configure')):
            c.configure()

    def metadata(self):
        """ Returns object sa.MetaData that combines metadata
        of all components from this environment """

        metadata = sa.MetaData()

        for comp in self.chain('initialize'):
            if hasattr(comp, 'metadata'):
                for key, tab in comp.metadata.tables.iteritems():
                    ctab = tab.tometadata(metadata)
                    sa.event.listen(
                        ctab, 'after_create',
                        # After table creation write component's name
                        # in comments, for debug purposes.
                        sa.DDL(
                            "COMMENT ON TABLE %(fullname)s IS "
                            + "'" + comp.identity + "'"
                        ))

        return metadata


_env = None


def setenv(env):
    global _env
    _env = env


class EnvMetaClass(type):
    def __getattr__(cls, name):
        return getattr(_env, name)

    def __call__(cls):
        return _env


class env(object):
    """ Proxy-class for global environment access. Use it only
    where it is impossible to get access to current environment
    by other means. However in any case, simultaneous work with
    multiple environments is currently not supported an will hardly
    ever be needed. To get original object for which messages are
    proxied one can use constructor ``env()``. """

    __metaclass__ = EnvMetaClass
