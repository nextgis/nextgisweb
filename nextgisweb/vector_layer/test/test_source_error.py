# -*- coding: utf-8 -*-
from __future__ import division, absolute_import, print_function, unicode_literals

import pytest
from osgeo import ogr

import nextgisweb.vector_layer.test
from nextgisweb.auth import User
from nextgisweb.compat import Path
from nextgisweb.core.exception import ValidationError
from nextgisweb.vector_layer import VectorLayer
from nextgisweb.spatial_ref_sys import SRS

path = Path(nextgisweb.vector_layer.test.__file__).parent / 'data' / 'errors'


@pytest.mark.parametrize('data, skip_other_geometry_type, fix_errors, \
                          skip_errors, geometry_type, expect_error', (
    ('geom-collection.geojson', False, 'NONE', False, None, True),
    ('geom-collection.geojson', False, 'SAFE', False, None, False),

    ('incomplete-geom.geojson', False, 'LOSSY', False, None, True),
    ('incomplete-geom.geojson', False, 'LOSSY', True, None, False),

    ('mixed-feature-geom.geojson', False, 'NONE', False, 'POINT', True),
    ('mixed-feature-geom.geojson', False, 'NONE', True, 'POINT', False),
    ('mixed-feature-geom.geojson', True, 'NONE', False, 'POINT', False),

    ('no-features.geojson', False, 'NONE', False, None, True),
    ('no-features.geojson', False, 'NONE', False, 'POINT', False),

    ('non-multi-geom.geojson', False, 'NONE', False, None, False),

    ('null-geom.geojson', False, 'LOSSY', False, None, True),
    ('null-geom.geojson', False, 'LOSSY', True, None, False),
    ('null-geom.geojson', True, 'NONE', False, None, False),

    ('self-intersection.geojson', False, 'SAFE', False, None, True),
    ('self-intersection.geojson', False, 'LOSSY', False, None, False),

    ('single-geom-collection.geojson', False, 'NONE', False, 'POINT', True),
    ('single-geom-collection.geojson', False, 'SAFE', False, 'POINT', False),
    ('single-geom-collection.geojson', True, 'NONE', False, 'POINT', False),
    ('single-geom-collection.geojson', False, 'SAFE', False, 'LINESTRING', True),

    ('unclosed-ring.geojson', False, 'LOSSY', False, None, True),
    ('unclosed-ring.geojson', False, 'LOSSY', True, None, False),
))
def test_create(data, skip_other_geometry_type, fix_errors, skip_errors, geometry_type,
                expect_error, ngw_resource_group, ngw_txn):
    obj = VectorLayer(
        parent_id=ngw_resource_group, display_name='vector_layer',
        owner_user=User.by_keyname('administrator'),
        srs=SRS.filter_by(id=3857).one()
    )

    src = str(path / data)
    ds = ogr.Open(src)
    layer = ds.GetLayer(0)

    geom_cast_params = dict(
        geometry_type=geometry_type,
        is_multi=None,
        has_z=None)

    def fun():
        obj.setup_from_ogr(layer, skip_other_geometry_type=skip_other_geometry_type,
                           geom_cast_params=geom_cast_params)
        obj.load_from_ogr(layer, skip_other_geometry_type=skip_other_geometry_type,
                          fix_errors=fix_errors, skip_errors=skip_errors)

    if expect_error:
        with pytest.raises(ValidationError):
            fun()
    else:
        fun()
