# -*- coding: utf-8 -*-
import re
from nose.tools import eq_

from .models import permission_set


def _parse(string):
    result = []

    if not string:
        return result

    for item in re.split(r'\s+', string):
        m = re.match(r'([\w\_\-]*)\:([UG])([ADI])\:([NS])', item)
        assert m, "Invalid syntax: '%s'" % item

        perm, match, oper, prop = \
            m.group(1), \
            m.group(2), \
            m.group(3), \
            True if m.group(4) == 'S' else False

        result.append((perm, match, oper, prop))

    return tuple(result)


def _test(*strings):
    return permission_set(
        map(_parse, strings),
        permissions=('foo', 'bar')
    )


def _testeq(*strings_and_result):
    eq_(
        _test(*strings_and_result[:-1]),
        set(strings_and_result[-1])
    )


def test_simple():
    _testeq(
        'foo:UA:N bar:UA:S',
        ('foo', 'bar')
    )

    _testeq(
        'foo:GA:N bar:GA:S',
        ('foo', 'bar')
    )


def test_inheritance():
    _testeq(
        'foo:UA:S',
        'bar:UA:S',
        ('foo', 'bar')
    )

    _testeq(
        'foo:UA:S bar:UA:S',
        'foo:UI:N',
        'bar:UI:N',
        ('bar', )
    )

    _testeq(
        "foo:UA:S foo:UA:N",
        "bar:UA:S bar:UA:N",
        ('bar', )
    )


def test_priority():
    _testeq(
        'foo:GA:S foo:UD:S',
        tuple()
    )

    _testeq(
        'foo:UD:S',
        'foo:UA:S',
        'foo:UA:S',
        tuple()
    )
