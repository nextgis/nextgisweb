# -*- coding: utf-8 -*-
from __future__ import unicode_literals, print_function, absolute_import
import re
import logging
import six
from collections import OrderedDict

import sqlalchemy as sa

from .lib.config import load_config
from .component import Component, load_all
from .package import pkginfo

logger = logging.getLogger(__name__)


class Env(object):

    def __init__(self, cfg=None):
        if cfg is None:
            cfg = load_config(None)

        packages_ign = re.split(r'[,\s]+', cfg.get('core.packages.ignore', ''))
        components_ign = re.split(r'[,\s]+', cfg.get('core.components.ignore', ''))

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

            # Extract component options from config
            cfgprefix = identity + '.'
            cfgcomp = OrderedDict([
                (k[len(cfgprefix):], v) for k, v in cfg.items()
                if k.startswith(cfgprefix)])

            instance = comp_class(env=self, settings=cfgcomp)
            self._components[comp_class.identity] = instance

            assert not hasattr(self, identity), \
                "Attribute name %s already used" % identity

            setattr(self, identity, instance)

    def chain(self, meth, first='core'):
        """ Building a sequence of method calls with dependencies.
        ``core`` component dependency gets added automatically for all
        components, so that it is returned first.

        :param meth: Name of the method to build sequence for. """

        seq = [first, ]

        def traverse(components):
            for c in components:
                if c.identity not in traverse.seq:
                    if hasattr(getattr(c, meth), '_require'):
                        try:
                            requirements = [self._components[i] for i in getattr(
                                c, meth)._require]
                        except KeyError:
                            raise Exception(c)
                        traverse(requirements)
                    traverse.seq.append(c.identity)

        traverse.seq = seq
        traverse(self._components.values())

        result = list([self._components[i] for i in traverse.seq])
        logger.debug(
            "Chain for method [%s]: %s", meth,
            ', '.join([c.identity for c in result]))
        return result

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
                for key, tab in comp.metadata.tables.items():
                    ctab = tab.tometadata(metadata)
                    sa.event.listen(
                        ctab, 'after_create',
                        # After table creation write component's name
                        # in comments, for debug purposes.
                        sa.DDL(
                            "COMMENT ON TABLE %(fullname)s IS "
                            + "'" + comp.identity + "'"  # NOQA: W503
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


class env(six.with_metaclass(EnvMetaClass, object)):
    """ Proxy-class for global environment access. Use it only
    where it is impossible to get access to current environment
    by other means. However in any case, simultaneous work with
    multiple environments is currently not supported an will hardly
    ever be needed. To get original object for which messages are
    proxied one can use constructor ``env()``. """
