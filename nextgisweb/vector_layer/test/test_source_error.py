from pathlib import Path
from uuid import uuid4

import pytest
from osgeo import ogr

from nextgisweb.models import DBSession
from nextgisweb.auth import User
from nextgisweb.core.exception import ValidationError
from nextgisweb.vector_layer import VectorLayer
from nextgisweb.spatial_ref_sys import SRS

path = Path(__file__).parent / 'data' / 'errors'


# List of creation test cases: file name, creation options, and final checks.
CREATE_TEST_PARAMS = (
    (
        'geom-collection.geojson', 
        dict(),
        dict(exception=ValidationError),
    ),

    (
        'geom-collection.geojson', 
        dict(fix_errors='SAFE'),
        dict(feature_count=2),
    ),

    (
        'incomplete-linestring.geojson',
        dict(fix_errors='LOSSY'),
        dict(exception=ValidationError),
    ),

    (
        'incomplete-linestring.geojson',
        dict(skip_errors=True),
        dict(feature_count=1)
    ),

    (
        'incomplete-polygon.geojson',
        dict(fix_errors='LOSSY'),
        dict(exception=ValidationError),
    ),

    (
        'mixed-feature-geom.geojson',
        dict(geometry_type='POINT', skip_other_geometry_types=True),
        dict(geometry_type='MULTIPOINT', feature_count=2),
    ),

    (
        # The second MULTIPOINT geometry must be converted to a SINGLE geometry.
        # The first POINT should be taken in LOSSY mode.
        'mixed-feature-geom.geojson',
        dict(
            geometry_type='POINT', skip_other_geometry_types=True,
            fix_errors='LOSSY', is_multi=False),
        dict(geometry_type='POINT', feature_count=2),
    ),
    (
        # The layer has only one LINESTRING geometry and it's valid.
        'mixed-feature-geom.geojson',
        dict(geometry_type='LINESTRING', skip_other_geometry_types=True),
        dict(geometry_type='LINESTRING', feature_count=1),
    ),

    (
        'non-multi-geom.geojson',
        dict(),
        dict(geometry_type='MULTIPOINT', feature_count=2),
    ),

    (
        'null-geom.geojson',
        dict(skip_other_geometry_types=True),
        dict(geometry_type='POINT', feature_count=1),
    ),

    (
        # Geometries with topology errors are accepted.
        'self-intersection.geojson',
        dict(fix_errors=None),
        dict(feature_count=1),
    ),

    # (
    #     'self-intersection.geojson',
    #     dict(fix_errors='LOSSY'),
    #     dict(geometry_type='POLYGON', feature_count=1),
    # ),

    (
        'single-geom-collection.geojson',
        dict(geometry_type='POINT', fix_errors='SAFE'),
        dict(geometry_type='POINT', feature_count=1),
    ),
    (
        'single-geom-collection.geojson',
        dict(geometry_type='POINT', skip_other_geometry_types=True),
        dict(geometry_type='POINT', feature_count=0),
    ),
    (
        'single-geom-collection.geojson',
        dict(geometry_type='POINT', fix_errors='LOSSSY'),
        dict(geometry_type='POINT', feature_count=1),
    ),
    (
        'single-geom-collection.geojson',
        dict(geometry_type='LINESTRING', fix_errors='SAFE'),
        dict(exception=ValidationError),
    ),
    (
        'single-geom-collection.geojson',
        dict(geometry_type='LINESTRING', fix_errors='LOSSY'),
        dict(geometry_type='LINESTRING', feature_count=1),
    ),

    (
        # It's not possible to chose geometry type here.
        'empty.geojson',
        dict(),
        dict(exception=ValidationError),
    ),
    (
        # An empty layer with MULTIPOINTZ must be created.
        'empty.geojson',
        dict(geometry_type='POINT', is_multi=True, has_z=True),
        dict(geometry_type='MULTIPOINTZ', feature_count=0),
    ),

    (
        # The unclosed ring must be reported as an error.
        'unclosed-ring.geojson',
        dict(),
        dict(exception=ValidationError),
    ),

    (
        # The unclosed ring must be closed in SAFE mode, QGIS does it sielently.
        'unclosed-ring.geojson',
        dict(fix_errors='SAFE'),
        dict(feature_count=1),
    ),

    (
        # Just check loading of POINTZ layers.
        'pointz.geojson',
        dict(geometry_type='POINT'),
        dict(geometry_type='POINTZ', feature_count=1),
    ),
    (
        # Explicit setting of geometry type.
        'pointz.geojson',
        dict(geometry_type='POINT', is_multi=False, has_z=True),
        dict(geometry_type='POINTZ', feature_count=1),
    ),
    (
        # Z coordinate should be stripped here.
        'pointz.geojson',
        dict(geometry_type='POINT', has_z=False, fix_errors='LOSSY'),
        dict(geometry_type='POINT', feature_count=1),
    ),
)


@pytest.mark.parametrize('filename, options, checks', CREATE_TEST_PARAMS)
def test_create(filename, options, checks, ngw_resource_group, ngw_txn):
    obj = VectorLayer(
        parent_id=ngw_resource_group, display_name='vector_layer',
        owner_user=User.by_keyname('administrator'),
        srs=SRS.filter_by(id=3857).one(),
        tbl_uuid=uuid4().hex
    ).persist()

    src = str(path / filename)
    ds = ogr.Open(src)
    layer = ds.GetLayer(0)

    geom_cast_params = dict(
        geometry_type=options.get('geometry_type'),
        is_multi=options.get('is_multi'),
        has_z=options.get('has_z'))

    def setup_and_load():
        setup_kwargs = dict()
        load_kwargs = dict()

        if 'skip_other_geometry_types' in options:
            setup_kwargs['skip_other_geometry_types'] = options['skip_other_geometry_types']
            load_kwargs['skip_other_geometry_types'] = options['skip_other_geometry_types']

        if 'fix_errors' in options:
            load_kwargs['fix_errors'] = options['fix_errors']
        if 'skip_errors' in options:
            load_kwargs['skip_errors'] = options['skip_errors']

        obj.setup_from_ogr(layer, geom_cast_params=geom_cast_params, **setup_kwargs)
        obj.load_from_ogr(layer, **load_kwargs)

    if 'exception' in checks:
        with pytest.raises(checks['exception']):
            setup_and_load()
        DBSession.expunge(obj)
    else:
        setup_and_load()

        DBSession.flush()

        if 'geometry_type' in checks:
            exp_geometry_type = checks['geometry_type']
            assert obj.geometry_type == exp_geometry_type, \
                "Expected geometry type was {} but actually got {}".format(
                    exp_geometry_type, obj.geometry_type)

        if 'feature_count' in checks:
            exp_feature_count = checks['feature_count']
            query = obj.feature_query()
            feature_count = query().total_count
            assert feature_count == exp_feature_count, \
                "Expected feature count was {} but got {}".format(
                    exp_feature_count, feature_count)
