# -*- coding: utf-8 -*-
from __future__ import division, absolute_import, print_function, unicode_literals

from os import path

import pytest
import transaction

from nextgisweb.auth import User
from nextgisweb.file_storage import FileObj
from nextgisweb.models import DBSession
from nextgisweb.svg_marker_library import SVGMarker, SVGMarkerLibrary


DATA_DIR = path.join(path.dirname(__file__), 'data/')
FOLDER1 = path.join(DATA_DIR, 'folder1/')
FOLDER2 = path.join(DATA_DIR, 'folder2/')


@pytest.fixture(scope='module', autouse=True)
def options(ngw_env):
    with ngw_env.svg_marker_library.options.override({'svg_paths': [FOLDER1, FOLDER2]}):
        yield


@pytest.fixture(scope='module')
def svg_lib(ngw_env, ngw_resource_group):
    with transaction.manager:
        svg_lib = SVGMarkerLibrary(
            parent_id=ngw_resource_group, display_name='test_marker_lib',
            owner_user=User.by_keyname('administrator')
        ).persist()

        DBSession.flush()

        fileobj1 = FileObj(component='svg_marker_library').persist()
        fileobj2 = FileObj(component='svg_marker_library').persist()

        SVGMarker(
            svg_marker_library_id=svg_lib.id,
            fileobj=fileobj1,
            name='marker1'
        ).persist()

        marker2 = SVGMarker(
            svg_marker_library_id=svg_lib.id,
            fileobj=fileobj2,
            name='marker2'
        ).persist()

        DBSession.flush()

    yield svg_lib

    with transaction.manager:
        DBSession.delete(marker2)
        DBSession.delete(fileobj1)
        DBSession.delete(fileobj2)
        DBSession.delete(svg_lib)


def test_lookup(svg_lib, ngw_env, ngw_webtest_app):
    svg_marker_library = ngw_env.svg_marker_library
    file_storage = ngw_env.file_storage

    def lookup_marker(name):
        return svg_marker_library.lookup(name, library=svg_lib)

    def filename(fileobj):
        return file_storage.filename(fileobj, makedirs=False)

    marker1 = svg_lib.find_svg_marker('marker1')
    marker2 = svg_lib.find_svg_marker('marker2')

    assert lookup_marker('marker1') == filename(marker1.fileobj)
    assert lookup_marker('marker2') == filename(marker2.fileobj)
    assert lookup_marker('marker3') == path.join(FOLDER1, 'marker3.svg')

    svg_marker_library.cache.clear()
    with transaction.manager:
        DBSession.delete(marker1)

    assert lookup_marker('marker1') == path.join(FOLDER1, 'marker1.svg')
    assert lookup_marker('marker2') == filename(marker2.fileobj)

    svg_marker_library.cache.clear()
    with svg_marker_library.options.override({'svg_paths': [FOLDER1]}):
        assert lookup_marker('marker1') == path.join(FOLDER1, 'marker1.svg')
