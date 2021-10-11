from collections import OrderedDict
from tempfile import NamedTemporaryFile

import pytest

from nextgisweb.lib.config.util import (
    environ_substitution,
    load_config)


@pytest.mark.parametrize('value, environ, expected', (
    ('${VAR}', {'VAR': 'value'}, 'value'),
    ('${MIS}', {}, '${MIS}'),
    ('${VAR:default}', {}, 'default'),
    ('${VAR?true:false}', {'VAR': 'foo'}, 'true'),
    ('${VAR?true:false}', {}, 'false'),
    (r'${MIS:$\{VAR\}}', {}, '${VAR}'),
    (r'${MIS:$\{VAR\}}', {'VAR': 'value'}, 'value'),
    (
        r'${F?$\{B?$\\\{F\\\}\\\:$\\\{B\\\}\:\}:}',
        {'F': 'foo', 'B': 'bar'},
        'foo:bar'
    ),
))
def test_environ_substitution(value, environ, expected):
    items = OrderedDict(key=value)
    environ_substitution(items, environ)
    assert items['key'] == expected


def test_load_config():
    with NamedTemporaryFile('w') as f1, NamedTemporaryFile('w') as f2:
        f1.write('\n'.join((
            "[comp_a]",
            "del.key = value",
            "env.key = value",
        )))

        f2.write('\n'.join((
            "[comp_a]",
            "del.key = ",
            "env.key = ",
        )))

        f1.flush()
        f2.flush()

        include = "[comp_b]\nkey = value"

        environ = {
            "NEXTGISWEB_COMP_A__ENV__KEY": "OK",
            "VAR": "value",
        }

        settings = load_config(
            [f1.name, f2.name], include,
            environ=environ)

        assert settings.get('comp_a.missing') is None
        assert 'comp_a.deleted.key' not in settings
        assert settings.get('comp_b.key') == "value"
