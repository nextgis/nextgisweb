# -*- coding: utf-8 -*-
from __future__ import division, absolute_import, print_function, unicode_literals


def test_route(webapp):
    webapp.get('/api/component/pyramid/route')


def test_pkg_version(webapp):
    webapp.get('/api/component/pyramid/pkg_version')
