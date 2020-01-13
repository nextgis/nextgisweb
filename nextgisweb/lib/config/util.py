# -*- coding: utf-8 -*-
from __future__ import division, unicode_literals, print_function, absolute_import
import os
import io
import re
import warnings
import six
from collections import OrderedDict
from six.moves.configparser import RawConfigParser


class _NO_DEFAULT(object):

    def __repr__(self):
        return "NO_DEFAULT"


NO_DEFAULT = _NO_DEFAULT()


def environ_to_key(name, prefix='NEXTGISWEB'):
    """ Convert environment variable name to setting name and return None
    in case of mismatch.

    >>> environ_to_key('NEXTGISWEB__COMPONENT__KEY')
    'component.key'

    >>> environ_to_key('NEXTGISWEB__COMPONENT__DOT__IN__KEY')
    'component.dot.in.key'

    >>> environ_to_key('NEXTGISWEB__COMPONENT__LIST__0')
    'component.list.0'

    >>> # Alternative form with one underscore
    >>> environ_to_key('NEXTGISWEB_COMPONENT__KEY')
    'component.key'

    >>> # Well known option for config file
    >>> assert environ_to_key('NEXTGISWEB_CONFIG') is None
    """

    name = name.lower()
    plow = prefix.lower()
    m = re.match('^' + plow + '_{1,2}([a-z][a-z0-9_]*?)((?:__[a-z0-9][a-z0-9_]*?)+)$', name)
    if m:
        component, keypart = m.groups()
        keycomp = tuple(keypart[2:].split('__'))
        return '.'.join((component, ) + keycomp)
    else:
        return None


def environ_substitution(items, environ):
    """ Substitute values in items from environment variables in two forms:
    "%(DEPRECATED)s" and "${SHELL_STYLE}". """

    dpr_re = re.compile(r'\%\(([a-z][a-z0-9_]*)\)s', re.IGNORECASE)
    shl_re = re.compile(r'\$\{([a-z][a-z0-9_]*)\}', re.IGNORECASE)

    def dpr_sub(m):
        warnings.warn("Deprecated environ subst form %(KEY)s, use ${KEY} instead!".replace(
            'KEY', m.group(1)), DeprecationWarning)
        return environ[m.group(1)]

    def shl_sub(m):
        return environ[m.group(1)]

    for k, v in list(items.items()):
        v = dpr_re.sub(dpr_sub, v)
        v = shl_re.sub(shl_sub, v)
        items[k] = v


def load_config(filenames, environ=os.environ, environ_prefix='NEXTGISWEB'):
    if filenames is None:
        filenames = environ.get(environ_prefix + '_CONFIG')

    if isinstance(filenames, six.string_types):
        filenames = filenames.split(':')

    result = OrderedDict()

    def apply_kv(key, value):
        if v != '':
            result[key] = value
        elif key in result:
            # Remove key for empty value
            del result[key]

    for fn in filenames:
        # Try open file to check file existance and readability
        with io.open(fn, 'r'):
            pass

        cfg = RawConfigParser()
        cfg.read(fn)

        for section in cfg.sections():
            for k, v in cfg.items(section):
                rkey = '.'.join((section, k))
                apply_kv(rkey, v)

    for k, v in environ.items():
        rkey = environ_to_key(k, prefix=environ_prefix)
        if rkey is not None:
            apply_kv(rkey, v)

    environ_substitution(result, environ)

    return result
