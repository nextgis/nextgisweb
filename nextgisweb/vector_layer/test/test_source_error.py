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


@pytest.mark.parametrize('data, error_tolerance, geometry_type, is_multi, has_z, expect_error', (
    ('geom-collection.geojson', 'STRICT', None, None, None, True),
    ('geom-collection.geojson', 'SAFE', None, None, None, False),

    ('incomplete-geom.geojson', 'LOSSY', None, None, None, True),
    ('incomplete-geom.geojson', 'SKIP', None, None, None, False),

    ('no-features.geojson', 'STRICT', None, None, None, True),
    ('no-features.geojson', 'STRICT', 'POINT', None, None, False),

    ('non-multi-geom.geojson', 'STRICT', None, None, None, False),

    ('null-geom.geojson', 'LOSSY', None, None, None, True),
    ('null-geom.geojson', 'SKIP', None, None, None, False),

    ('self-intersection.geojson', 'SAFE', None, None, None, True),
    ('self-intersection.geojson', 'LOSSY', None, None, None, False),

    ('single-geom-collection.geojson', 'STRICT', 'POINT', None, None, True),
    ('single-geom-collection.geojson', 'SAFE', 'POINT', None, None, False),
    ('single-geom-collection.geojson', 'SAFE', 'LINESTRING', None, None, True),

    ('unclosed-ring.geojson', 'LOSSY', None, None, None, True),
    ('unclosed-ring.geojson', 'SKIP', None, None, None, False),
))
def test_create(data, error_tolerance, geometry_type, is_multi, has_z,
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
        is_multi=is_multi,
        has_z=has_z)

    def fun():
        obj.setup_from_ogr(layer, geom_cast_params=geom_cast_params)
        obj.load_from_ogr(layer, error_tolerance=error_tolerance)

    if expect_error:
        with pytest.raises(ValidationError):
            fun()
    else:
        fun()
