# -*- coding: utf-8 -*-
from __future__ import division, absolute_import, print_function, unicode_literals

from nextgisweb.component import Component, load_all


def pytest_generate_tests(metafunc):
    if "component" in metafunc.fixturenames:
        load_all()
        metafunc.parametrize('component', [c.identity for c in Component.registry])


def test_route(webapp):
    webapp.get('/api/component/pyramid/route')


def test_pkg_version(webapp):
    webapp.get('/api/component/pyramid/pkg_version')


def test_settings(component, webapp):
    if hasattr(Component.registry[component], 'client_settings'):
        webapp.get('/api/component/pyramid/settings?component={}'.format(component))


def test_locdata(component, webapp):
    webapp.get('/api/component/pyramid/locdata/{component}/en'.format(
        component=component))
