# -*- coding: utf-8 -*-
from __future__ import division, absolute_import, print_function, unicode_literals

import pytest
from pyramid.interfaces import IAuthenticationPolicy


@pytest.fixture()
def ngw_auth_administrator(ngw_pyramid_config):
    policy = ngw_pyramid_config.registry.getUtility(IAuthenticationPolicy)

    assert policy.test_user is None, "Authentication policy test_used is already defined!"

    policy.test_user = 'administrator'
    yield
    policy.test_user = None
