# -*- coding: utf-8 -*-
from __future__ import division, unicode_literals, print_function, absolute_import

import pytest

from nextgisweb.lib.config.otype import (
    OptionType, Text, Boolean, Integer, List)


@pytest.mark.parametrize('otype, input, expected', (
    (Text, 'foo', 'foo'),
    (Boolean, 'true', True),
    (Boolean, 'false', False),
    (Integer, '42', 42),
    (bool, 'yes', True),
    (bool, 'no', False),
    (List, 'a,b,c', ['a', 'b', 'c']),
    (List, 'ab, bc, cd', ['ab', 'bc', 'cd']),
    (List(Integer), '1, 2, 3', [1, 2, 3]),
    (List(separator=r'\s+'), 'en ru', ['en', 'ru'])
))
def test_parse(otype, input, expected):
    assert OptionType.normalize(otype).loads(input) == expected
