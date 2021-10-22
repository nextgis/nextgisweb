import os
import io
import re
from collections import OrderedDict
from configparser import RawConfigParser


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


def key_to_environ(name, prefix='NEXTGISWEB'):
    """ Convert key to environment variable name """

    return '{}__{}'.format(
        prefix, name.replace('.', '__')
    ).upper()


def environ_substitution(items, environ):
    """ Substitute values in items from environment variables """

    shl_re = re.compile(r'''
        \$\{
            ([a-z][a-z0-9_]*)
            (?:
                (?:\:
                    (?P<default>(?:\\.|[^\\\:\}])*)
                )|
                (?:\?
                    (?P<true>(?:\\.|[^\\\:\}])*)
                    \:
                    (?P<false>(?:\\.|[^\\\:\}])*)
                )
            )?
        \}
    ''', re.IGNORECASE | re.VERBOSE)

    unescape_re = re.compile(r'\\(.)')

    def substitute(v):
        return shl_re.sub(subfn, v)

    def unescape(v):
        return unescape_re.sub(r'\1', v)

    def subfn(m):
        variable = m.group(1)

        default = m.group('default')
        vtrue, vfalse = m.group('true', 'false')

        if vtrue is not None and vfalse is not None:
            return substitute(unescape(
                vtrue if (variable in environ)
                else vfalse))

        elif variable in environ:
            return environ[variable]

        elif default is not None:
            return substitute(unescape(default))

        else:
            return m.group(0)

    for k, v in list(items.items()):
        items[k] = substitute(v)


def load_config(filenames, include, environ=os.environ, environ_prefix='NEXTGISWEB', hupper=False):
    if filenames is None:
        filenames = environ.get(environ_prefix + '_CONFIG')

    if isinstance(filenames, str):
        filenames = filenames.split(':')

    if include is None:
        include = environ.get(environ_prefix + '_CONFIG_INCLUDE')

    result = OrderedDict()

    def apply_kv(key, value):
        if value != '':
            result[key] = value
        elif key in result:
            # Remove key for empty value
            del result[key]

    def load_fp(fp):
        cfg = RawConfigParser()
        cfg.read_file(fp)
        for section in cfg.sections():
            for k, v in cfg.items(section):
                rkey = '.'.join((section, k))
                apply_kv(rkey, v)

    if hupper:
        from hupper import is_active, get_reloader
        if is_active():
            get_reloader().watch_files(filenames)

    if filenames is not None:
        for fn in filenames:
            with io.open(fn, 'r') as fp:
                load_fp(fp)

    if include is not None:
        fp = io.StringIO(include)
        load_fp(fp)

    for k, v in environ.items():
        rkey = environ_to_key(k, prefix=environ_prefix)
        if rkey is not None:
            apply_kv(rkey, v)

    environ_substitution(result, environ)

    return result
