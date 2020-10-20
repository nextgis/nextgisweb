# -*- coding: utf-8 -*-
from __future__ import division, absolute_import, print_function, unicode_literals

import pytest

@pytest.fixture(scope='function', autouse=True)
def force_schema_validation(ngw_env):
    comp = ngw_env.wfsserver
    remember = comp.force_schema_validation
    try:
        comp.force_schema_validation = True
        yield
    finally:
        comp.force_schema_validation = remember
