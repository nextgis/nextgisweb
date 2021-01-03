# -*- coding: utf-8 -*-
from __future__ import division, unicode_literals, print_function, absolute_import

import pytest

from nextgisweb.compat import Path
from nextgisweb.lib.migration.registry import Registry
from nextgisweb.lib.migration.graph import MigrationGraph


@pytest.fixture(scope='module')
def registry():
    regpath = Path(__file__).parent / 'registry'

    reg = Registry()
    for c in ('foo', 'bar'):
        reg.scandir(c, regpath / c)

    yield reg


@pytest.fixture(scope='module')
def graph(registry):
    yield MigrationGraph(registry, install_dependencies={'bar': ('foo', )})
