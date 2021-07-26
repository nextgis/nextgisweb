# -*- coding: utf-8 -*-
from __future__ import division, unicode_literals, print_function, absolute_import

import re
import logging
import logging.config
import os
from collections import OrderedDict

import six
import sqlalchemy as sa

from .lib.config import OptionAnnotations, Option, ConfigOptions, load_config
from .component import Component, load_all
from .package import pkginfo

logger = logging.getLogger(__name__)


class Env(object):

    def __init__(self, cfg=None, setup_logging=True, enable_disabled=False):
        if cfg is None:
            cfg = load_config(None, None)

        cfgenv = _filter_by_prefix(cfg, 'environment.')
        self.options = ConfigOptions(cfgenv, self.option_annotations)
        if setup_logging:
            self.setup_logging()

        if len(cfg) == 0:
            logger.info("Creating environment without any configuration.")

        cfg_components = OrderedDict()
        cfg_packages = OrderedDict()

        # TODO: Maybe there is a better way to iterate over options exists.
        for k, v in cfgenv.items():
            if k.startswith('package.'):
                pi = k[len('package.'):]
                pv = self.options[k]
                if pv is not None:
                    cfg_packages[pi] = pv
            elif k.startswith('component.'):
                ci = k[len('component.'):]
                cv = self.options[k]
                if cv is not None:
                    cfg_components[ci] = cv

        packages_ignore = cfg.get('core.packages.ignore')
        if packages_ignore is not None:
            for pi in re.split(r'[,\s]+', packages_ignore):
                logger.warning(
                    "Environment config option 'package.{0} = false' "
                    "should be used instead of core component option "
                    "'packages.ignore = {0}'."
                    .format(pi))
                cfg_packages[pi] = False

        components_ignore = cfg.get('core.components.ignore')
        if components_ignore is not None:
            for ci in re.split(r'[,\s]+', components_ignore):
                logger.warning(
                    "Environment config option 'component.{0} = false' "
                    "should be used instead of core component option "
                    "'component.ignore = {0}'."
                    .format(ci))
                cfg_components[ci] = False

        loaded_packages, loaded_components = load_all(
            packages=cfg_packages, components=cfg_components,
            enable_disabled=enable_disabled)

        self.packages = dict((
            (name, pkginfo.packages[name])
            for name in loaded_packages))

        not_found_packages = set(cfg_packages) - set(pkginfo.packages.keys())
        if len(not_found_packages) > 0:
            logger.warning(
                "Not found packages from configuration: {}"
                .format(', '.join(not_found_packages)))

        not_found_components = set(cfg_components) - set(pkginfo.components)
        if len(not_found_components) > 0:
            logger.warning(
                "Not found components from configuration: {}"
                .format(', '.join(not_found_components)))

        self._components = dict()

        for comp_class in Component.registry:
            identity = comp_class.identity
            if identity not in loaded_components:
                logger.warn(
                    "Component '%s' was imported unexpectedly and won't "
                    "be initialized!", identity)
                continue

            cfgcomp = _filter_by_prefix(cfg, identity + '.')
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
                            raise Exception("Failed to collect requirements for: %s" % c.identity)
                        traverse(requirements)
                    traverse.seq.append(c.identity)

        traverse.seq = seq
        traverse(self._components.values())

        # Kludge for raising method to the top of the chain (for ngwcluster)
        for c in list(traverse.seq):
            m = getattr(self._components[c], meth)
            if hasattr(m, '_iam_the_first'):
                traverse.seq.remove(c)
                traverse.seq.insert(0, c)

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
                    ctab._component_identity = comp.identity
                    sa.event.listen(
                        ctab, 'after_create',
                        # After table creation write component's name
                        # in comments, for debug purposes.
                        sa.DDL(
                            "COMMENT ON TABLE %(fullname)s IS "
                            + "'" + comp.identity + "'"  # NOQA: W503
                        ))

        return metadata

    def setup_logging(self):
        config = {
            'version': 1,
            'formatters': {},
            'handlers': {
                'default': {
                    'class': 'logging.StreamHandler',
                    'formatter': 'default',
                },
            },
            'root': {
                'level': self.options['logging.level'],
                'handlers': ['default'],
            },
        }

        config['formatters']['default'] = {
            'format':
                ('%(asctime)s ' if self.options['logging.timestamp'] else '')
                + '%(levelname)-8s [%(name)s] %(message)s'}
        config['loggers'] = loggers = {}

        has_options = False
        has_ini_config = 'logging.ini_config' in self.options

        # TODO: Maybe there is a better way to iterate over options exists.
        logging_options = ['logger.waitress'] + [
            k for k in self.options._options.keys()
            if k.startswith(('logging.', 'logger.'))]

        for k in logging_options:
            v = self.options.get(k)
            if k.startswith('logger.'):
                has_options = True
                qaulname, level = v.split(':', 2)
                level = level.upper()
                loggers[qaulname] = dict(
                    level=level, propagate=False,
                    handlers=['default'])
            elif k.startswith('logging.'):
                if k != 'logging.ini_config':
                    has_options = True

        logging.captureWarnings(True)

        if has_options or (not has_ini_config):
            logging.config.dictConfig(config)
        elif has_ini_config:
            logging.config.fileConfig(self.options['logging.ini_config'])

        if has_options and has_ini_config:
            logger.warning(
                "Environment configuration option logging.ini_cofig was "
                "ignored because other logging configuration options were "
                "given.")

    @property
    def ngupdate_url(self):
        env_val = os.environ.get('NGUPDATE_URL', 'https://update.nextgis.com')
        return env_val if env_val != '' else None

    option_annotations = OptionAnnotations((
        Option('package.*', bool, None, doc=(
            "Disable installed package by setting false.")),
        Option('component.*', bool, None, doc=(
            "Enable optional component by setting true. "
            "Or disable component by setting false.")),

        Option('logging.level', str, 'WARNING', doc=(
            "Default logging level which is set to root logger.")),
        Option('logging.timestamp', bool, default=False, doc=(
            "Print timestamps in log records or not.")),
        Option('logging.ini_config', str, doc=(
            "Deprecated. Load logging configuration from ini-style file.")),

        Option('logger.*', str, doc=(
            "Set logging level of the specific logger in the following "
            "format: qualified_name:level. Where qualified_name is a dotted "
            "python logger name, nextgisweb.env for example. Any key name "
            "can be used and it affects nothing. But can be used when "
            "overriding options.")),

        Option('logger.waitress', str, default='waitress:error', doc=(
            "By default waitress (builtin HTTP server) logger level is set to "
            "ERROR. It's possible to override this setting here.")),

        Option('distribution.name', default=None),
        Option('distribution.description', default=None),
        Option('distribution.version', default=None),
        Option('distribution.date', default=None),
    ))


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


def _filter_by_prefix(cfg, prefix):
    return OrderedDict([
        (k[len(prefix):], v) for k, v in cfg.items()
        if k.startswith(prefix)])
