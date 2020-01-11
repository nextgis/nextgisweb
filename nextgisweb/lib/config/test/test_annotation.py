# -*- coding: utf-8 -*-
from __future__ import division, unicode_literals, print_function, absolute_import

import pytest

from nextgisweb.lib.config.annotation import (
    Option,
    ConfigOptions,
    MissingAnnotationWarning,
    MissingDefaultError)


@pytest.fixture(scope='module')
def copts():
    annotations = (
        Option('root'),
        Option('root.*.int', int),
        Option('root.*.*'),
        Option('default.wi', default='value'),
        Option('default.wo'),
    )

    return ConfigOptions({
        'root': 'root',
        'root.a.int': '42',
        'root.b.str': 'str',
        'root.c.not.found': 'some',
        'not.found': 'some',
    }, annotations)


def test_convert(copts):
    assert copts['root'] == 'root'
    assert copts['root.a.int'] == 42
    assert copts['root.b.str'] == 'str'


def test_missing(copts):
    with pytest.warns(MissingAnnotationWarning):
        copts['root.c.not.found'] == 'some'


def test_defaults(copts):
    assert copts['default.wi'] == 'value'

    assert copts.get('default.wo', 'value') == 'value'
    with pytest.raises(MissingDefaultError):
        copts.get('default.wo')


def test_with_prefix(copts):
    prefixed = copts.with_prefix('root')
    assert prefixed['a.int'] == 42
    assert prefixed['b.str'] == 'str'
