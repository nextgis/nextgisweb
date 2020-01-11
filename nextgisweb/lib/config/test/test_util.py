# -*- coding: utf-8 -*-
from __future__ import division, unicode_literals, print_function, absolute_import
from collections import OrderedDict
from tempfile import NamedTemporaryFile

import pytest

from nextgisweb.lib.config.util import (
    environ_substitution,
    load_config)


def test_environ_substitution():
    items = OrderedDict()

    items['one'] = "Hi, ${FOO}!"
    environ_substitution(items, {'FOO': 'John'})
    assert items['one'] == "Hi, John!"

    items['two'] = "Bye, %(BAR)s!"
    with pytest.warns(Warning):
        environ_substitution(items, {'BAR': 'Tom'})
    assert items['two'] == "Bye, Tom!"

    with pytest.raises(KeyError):
        items['three'] = "${MISSING}"
        environ_substitution(items, {})


def test_load_config():
    with NamedTemporaryFile('w') as f1, NamedTemporaryFile('w') as f2:
        f1.write('\n'.join((
            "[comp_a]",
            "del.key = value",
            "env.key = value",
        )))

        f2.write('\n'.join((
            "[comp_b]",
            "subst = ${VAR}",

            "[comp_a]",
            "del.key = ",
            "env.key = ",
        )))

        f1.flush()
        f2.flush()

        settings = load_config([f1.name, f2.name], {
            "NEXTGISWEB__COMP_A__ENV__KEY": "OK",
            "VAR": "value"
        })

        assert settings.get('comp_a.missing') is None
        assert 'comp_a.deleted.key' not in settings
        assert settings.get('comp_b.subst') == "value"
