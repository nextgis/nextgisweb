# -*- coding: utf-8 -*-
from __future__ import division, unicode_literals, print_function, absolute_import
import warnings
import six
from collections import defaultdict

from .otype import OptionType
from .util import NO_DEFAULT


class Option(object):

    def __init__(
        self, key, otype=six.text_type, default=NO_DEFAULT,
        required=False, secure=False, doc=None
    ):
        self._key = key
        self._otype = OptionType.normalize(otype)
        self._default = default
        self._required = required
        self._secure = secure
        self._doc = doc

    @property
    def key(self):
        return self._key

    @property
    def otype(self):
        return OptionType.normalize(self._otype)

    @property
    def default(self):
        return self._default

    @property
    def required(self):
        return self._required

    @property
    def secure(self):
        return self._secure

    @property
    def doc(self):
        return self._doc


class ConfigOptions(object):

    def __init__(self, options, annotations):
        self._options = options
        self._annotations = annotations
        self._values = dict()

        # Build annotation index
        def idxitm():
            return defaultdict(idxitm)

        self._aindex = idxitm()
        for a in self._annotations:
            node = self._aindex
            for kp in a.key.split('.'):
                node = node[kp]
            node[None] = a

    def _akey(self, key):
        """
        >>> a_x = Option('x')
        >>> a_xy = Option('x.y')
        >>> a_xa = Option('x.*')
        >>> aco = ConfigOptions({}, (a_x, a_xy, a_xa))
        >>> assert aco._akey('x') == a_x
        >>> assert aco._akey('x.y') == a_xy
        >>> assert aco._akey('x.z') == a_xa
        >>> assert aco._akey('y') is None
        """

        node = self._aindex
        for kp in key.split('.'):
            if kp in node:
                node = node[kp]
            elif '*' in node:
                node = node['*']
            else:
                return None

        return node[None] if (None in node) else None

    def _akey_warn(self, key):
        result = self._akey(key)
        if result is None:
            warnings.warn(
                "Missing annotation for key: {}!".format(key),
                MissingAnnotationWarning, stacklevel=3)
            result = Option(None)
        return result

    def __getitem__(self, key, annotation=None, use_default=True):
        try:
            return self._values[key]
        except KeyError:
            pass

        if annotation is None:
            annotation = self._akey_warn(key)
        try:
            optvalue = self._options[key]
        except KeyError as exc:
            if use_default:
                if annotation.default != NO_DEFAULT:
                    self._values[key] = annotation.default
                    return annotation.default
                else:
                    raise MissingDefaultError(key)
            else:
                raise exc

        value = annotation.otype.loads(optvalue)
        self._values[key] = value
        return value

    def __contains__(self, key):
        self._akey_warn(key)
        return key in self._options

    def __setitem__(self, key, value):
        self._values[key] = value

    def get(self, key, default=NO_DEFAULT):
        """ Get option by key with given default value. """

        annotation = self._akey_warn(key)

        try:
            value = self.__getitem__(key, annotation=annotation, use_default=False)
        except KeyError:
            default = default if default != NO_DEFAULT else (
                annotation.default if annotation.default != NO_DEFAULT else NO_DEFAULT)
            if default == NO_DEFAULT:
                raise MissingDefaultError(key)
            value = default

        return value

    def with_prefix(self, prefix):
        """ Key prefixed proxy object for options access. """

        return ConfigOptionsPrefixProxy(self, prefix)


class ConfigOptionsPrefixProxy(object):

    def __init__(self, parent, prefix):
        self._parent = parent
        self._prefix = prefix

    def _pkey(self, key):
        return self._prefix + '.' + key

    def __getitem__(self, key):
        return self._parent[self._pkey(key)]

    def __setitem__(self, key, value):
        self._parent[self._pkey[key]] = value

    def __contains__(self, key):
        return self._pkey(key) in self._parent

    def get(self, key, default=NO_DEFAULT):
        return self._parent.get(self._pkey(key), default=default)


class MissingAnnotationWarning(Warning):
    pass


class MissingDefaultError(Exception):

    def __init__(self, key):
        super(MissingDefaultError, self).__init__(
            "Missing default for key: {}".format(key))
