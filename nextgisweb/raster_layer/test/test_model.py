# -*- coding: utf-8 -*-
from __future__ import division, absolute_import, print_function, unicode_literals
import os.path

import pytest

from nextgisweb.auth import User
from nextgisweb.spatial_ref_sys import SRS

from nextgisweb.raster_layer.model import RasterLayer


@pytest.mark.parametrize('source, band_count, srs_id', [
    # Both rasters haven't NODATA value, so the alpha band is expected to be
    # added in case of reprojection from EPSG:4326 to EPSG:3857.
    ('sochi-aster-colorized.tif', 4, 3857),
    ('sochi-aster-colorized.tif', 3, 4326),
    ('sochi-aster-dem.tif', 2, 3857),
    ('sochi-aster-dem.tif', 1, 4326),
])
def test_load_file(source, band_count, srs_id, ngw_env, ngw_txn, ngw_resource_group):
    res = RasterLayer(
        parent_id=ngw_resource_group, display_name='test:{}'.format(source),
        owner_user=User.by_keyname('administrator'),
        srs=SRS.filter_by(id=srs_id).one(),
    ).persist()

    res.load_file(os.path.join(os.path.split(__file__)[0], 'data', source), ngw_env)
    assert res.band_count == band_count

    fn_data = ngw_env.file_storage.filename(res.fileobj)
    assert not os.path.islink(fn_data)

    fn_work = ngw_env.raster_layer.workdir_filename(res.fileobj)
    assert os.path.islink(fn_work) and os.path.realpath(fn_work) == fn_data

    # Check for raster overviews
    assert os.path.isfile(fn_work + '.ovr')
