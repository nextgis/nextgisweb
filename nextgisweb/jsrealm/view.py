# -*- coding: utf-8 -*-
from __future__ import division, absolute_import, print_function, unicode_literals
import io
import re
import os
import json
import logging
import os.path
from shutil import copyfileobj, copystat
from tempfile import NamedTemporaryFile

from pyramid.response import FileResponse
from pyramid.httpexceptions import HTTPNotFound

_logger = logging.getLogger(__name__)


def setup_pyramid(comp, config):
    comp.dist_path = comp.options['dist_path']
    jsrealm_dist = '/static{}/dist/*subpath'.format(comp.env.pyramid.static_key)
    config.add_route('jsrealm.dist', jsrealm_dist).add_view(dist)

    config.add_route('jsrealm.test.demo', '/test/jsrealm/demo') \
        .add_view(test, renderer="nextgisweb:jsrealm/template/demo.mako")


def dist(request):
    dist_path = request.env.jsrealm.options['dist_path']
    filename = os.path.join(dist_path, *request.matchdict['subpath'])
    if os.path.isfile(filename):
        return FileResponse(filename, cache_max_age=3600, request=request)
    else:
        raise HTTPNotFound()


def test(request):
    return dict()
