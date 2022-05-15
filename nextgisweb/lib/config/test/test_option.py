from datetime import timedelta
from inspect import isclass

import pytest

from nextgisweb.lib.config.otype import (
    OptionType, Text, Boolean, Integer, List, SizeInBytes)


@pytest.mark.parametrize('otype, input, expected,', (
    (Text, 'foo', 'foo'),
    (Boolean, 'true', True),
    (Boolean, 'false', False),
    (Integer, '42', 42),
    (bool, 'yes', True),
    (bool, 'no', False),
    (timedelta, '92d', timedelta(days=92)),
    (timedelta, '24h', timedelta(days=1)),
    (timedelta, '1440m', timedelta(days=1)),
    (timedelta, '86400', timedelta(days=1)),
    (List, 'a,b,c', ['a', 'b', 'c']),
    (List, 'ab, bc, cd', ['ab', 'bc', 'cd']),
    (List(Integer), '1, 2, 3', [1, 2, 3]),
    (List(str), 'en, ru', ['en', 'ru']),
    (SizeInBytes, '1024', 1024),
    (SizeInBytes, '-1', ValueError),
    (SizeInBytes, '4M', 4 * 1024 ** 2),
    (SizeInBytes, '2 gB', 2 * 1024 ** 3),
    (SizeInBytes, '42T', 42 * 1024 ** 4),
    (SizeInBytes, '1YB', ValueError),
))
def test_loads_dumps(otype, input, expected):
    norm = OptionType.normalize(otype)
    if isclass(expected) and issubclass(expected, Exception):
        with pytest.raises(expected):
            norm.loads(input)
    else:
        assert norm.loads(input) == expected
        assert norm.loads(norm.dumps(expected)) == expected
