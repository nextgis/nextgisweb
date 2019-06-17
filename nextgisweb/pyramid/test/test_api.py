# -*- coding: utf-8 -*-
import pytest


def test_route(webapp):
    webapp.get('/api/component/pyramid/route')


def test_pkg_version(webapp):
    webapp.get('/api/component/pyramid/pkg_version')