import pytest

from .. import filename_strip


@pytest.mark.parametrize('name, filename', (
    ('name', 'name',),
    ('!name?', '!name',),
    ('***', '',),
    ('\\n:a|m"\'e/', 'nam\'e',),
    ('ชื่อ', 'ชื่อ',),
))
def test_strip(name, filename):
    assert filename_strip(name) == filename
