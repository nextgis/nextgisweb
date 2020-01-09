# -*- coding: utf-8 -*-
from __future__ import division, absolute_import, print_function, unicode_literals
import os.path

import pytest

from nextgisweb.auth import User
from nextgisweb.spatial_ref_sys import SRS

from nextgisweb.raster_layer.model import RasterLayer


@pytest.mark.parametrize('source, band_count', [
    ('sochi-aster-colorized.tif', 4),
    ('sochi-aster-dem.tif', 1),
])
def test_load_file(source, band_count, txn, env):
    res = RasterLayer(
        parent_id=0, display_name='test:{}'.format(source),
        owner_user=User.by_keyname('administrator'),
        srs=SRS.filter_by(id=3857).one(),
    ).persist()

    res.load_file(os.path.join(os.path.split(__file__)[0], 'data', source), env)
    assert res.band_count == band_count

    fn_data = env.file_storage.filename(res.fileobj)
    assert not os.path.islink(fn_data)

    fn_work = env.raster_layer.workdir_filename(res.fileobj)
    assert os.path.islink(fn_work) and os.path.realpath(fn_work) == fn_data

    # Check for raster overviews
    assert os.path.isfile(fn_work + '.ovr')
