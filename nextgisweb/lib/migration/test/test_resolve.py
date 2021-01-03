# -*- coding: utf-8 -*-
from __future__ import division, unicode_literals, print_function, absolute_import
from collections import OrderedDict

from nextgisweb.lib.migration.graph import OperationGraph


class MO(object):
    optype = 'test'
    oprank = 0

    def __init__(self, condition, values, gvinv=False):
        self.text = "{} -> {}".format(condition, values)
        self.condition = a2d(condition)
        self.action = a2d(values)
        self.gvinv = gvinv

    def __repr__(self):
        return self.text


_uc = set((chr(i) for i in range(ord('A'), ord('Z') + 1)))


def a2d(s):
    return OrderedDict((
        (c.upper(), c in _uc)
        for c in s))


def test_basic():
    ds = OperationGraph([
        MO('A', 'B', True),
        MO('C', 'D'),
        MO('BD', 'E'),
        MO('X', 'Y'),
        MO('Y', 'Z'),
    ])
    s = (a2d('ACX'), a2d('EZ'))
    # print(ds.to_dot(*s))
    ds.resolve(*s)


def test_rollback():
    ds = OperationGraph([
        MO('A', 'B'), MO('Bc', 'b', True),
        MO('B', 'C'), MO('Cd', 'c', True),
        MO('C', 'D'), MO('De', 'd', True),
        MO('D', 'E'), MO('E', 'e', True),
    ])
    s = a2d('ABCDE'), a2d('b')
    # print(ds.to_dot(*s))
    ds.resolve(*s)


def test_ahead():
    ds = OperationGraph([
        MO('A', 'B'), MO('Bc', 'b', True),
        MO('B', 'C'), MO('Cd', 'c', True),
        MO('C', 'D'), MO('De', 'd', True),
        MO('D', 'E'), MO('E', 'e', True),

        MO('B', 'X'), MO('Xby', 'x', True),
        MO('X', 'Y'), MO('Yz', 'y', True),
        MO('Y', 'Z'), MO('Z', 'z', True),
    ])
    s = (a2d('ABCDEXYZ'), a2d('x'))
    # print(ds.to_dot(*s))
    ds.resolve(*s)


def test_forkjoin_revert():
    ds = OperationGraph([
        MO('A', 'B'), MO('Bc', 'b', True),
        MO('B', 'C'), MO('Cd', 'c', True),
        MO('C', 'D'), MO('Def', 'd', True),
        MO('D', 'E'), MO('Em', 'e', True),
        MO('D', 'F'), MO('Fm', 'f', True),
        MO('EF', 'M'), MO('Mn', 'm', True),
        MO('M', 'N'), MO('N', 'n', True),
    ])
    s = (a2d('ABCDEFMN'), a2d('d'))
    # print(ds.to_dot(*s))
    ds.resolve(*s)
