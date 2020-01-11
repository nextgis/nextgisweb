# -*- coding: utf-8 -*-
from __future__ import division, absolute_import, print_function, unicode_literals

import pytest

from nextgisweb.component import Component, load_all
from nextgisweb.lib.config import Option


def pytest_generate_tests(metafunc):
    if 'comp_option_annotations' in metafunc.fixturenames:
        load_all()
        metafunc.parametrize('comp_option_annotations', [
            pytest.param(c, id=c.identity) for c in Component.registry
            if hasattr(c, 'option_annotations')])


def test_annotations(comp_option_annotations):
    for oa in comp_option_annotations.option_annotations:
        assert isinstance(oa, Option)
