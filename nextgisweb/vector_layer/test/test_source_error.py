from pathlib import Path

import pytest

from nextgisweb.env import DBSession
from nextgisweb.lib.ogrhelper import read_dataset

from nextgisweb.core.exception import ValidationError

from .. import VectorLayer

pytestmark = pytest.mark.usefixtures("ngw_resource_defaults")

path = Path(__file__).parent / "data" / "errors"


# List of creation test cases: file name, creation options, and final checks.
CREATE_TEST_PARAMS = (
    (
        "geom-collection.geojson",
        dict(),
        dict(exception=ValidationError),
    ),
    (
        "geom-collection.geojson",
        dict(fix_errors="SAFE"),
        dict(feature_count=2),
    ),
    (
        "incomplete-linestring.geojson",
        dict(fix_errors="LOSSY"),
        dict(exception=ValidationError),
    ),
    ("incomplete-linestring.geojson", dict(skip_errors=True), dict(feature_count=1)),
    (
        "incomplete-polygon.geojson",
        dict(fix_errors="LOSSY"),
        dict(exception=ValidationError),
    ),
    (
        "mixed-feature-geom.geojson",
        dict(geometry_type="POINT", skip_other_geometry_types=True),
        dict(geometry_type="MULTIPOINT", feature_count=2),
    ),
    (
        # The second MULTIPOINT geometry must be converted to a SINGLE geometry.
        # The first POINT should be taken in LOSSY mode.
        "mixed-feature-geom.geojson",
        dict(
            geometry_type="POINT",
            skip_other_geometry_types=True,
            fix_errors="LOSSY",
            is_multi=False,
        ),
        dict(geometry_type="POINT", feature_count=2),
    ),
    (
        # The layer has only one LINESTRING geometry and it's valid.
        "mixed-feature-geom.geojson",
        dict(geometry_type="LINESTRING", skip_other_geometry_types=True),
        dict(geometry_type="LINESTRING", feature_count=1),
    ),
    (
        "non-multi-geom.geojson",
        dict(),
        dict(geometry_type="MULTIPOINT", feature_count=2),
    ),
    (
        "null-geom.geojson",
        dict(skip_other_geometry_types=True),
        dict(geometry_type="POINT", feature_count=1),
    ),
    (
        # Geometries with topology errors are accepted.
        "self-intersection.geojson",
        dict(fix_errors=None),
        dict(feature_count=1),
    ),
    # (
    #     'self-intersection.geojson',
    #     dict(fix_errors='LOSSY'),
    #     dict(geometry_type='POLYGON', feature_count=1),
    # ),
    (
        "single-geom-collection.geojson",
        dict(geometry_type="POINT", fix_errors="SAFE"),
        dict(geometry_type="POINT", feature_count=1),
    ),
    (
        "single-geom-collection.geojson",
        dict(geometry_type="POINT", skip_other_geometry_types=True),
        dict(geometry_type="POINT", feature_count=0),
    ),
    (
        "single-geom-collection.geojson",
        dict(geometry_type="POINT", fix_errors="LOSSSY"),
        dict(geometry_type="POINT", feature_count=1),
    ),
    (
        "single-geom-collection.geojson",
        dict(geometry_type="LINESTRING", fix_errors="SAFE"),
        dict(exception=ValidationError),
    ),
    (
        "single-geom-collection.geojson",
        dict(geometry_type="LINESTRING", fix_errors="LOSSY"),
        dict(geometry_type="LINESTRING", feature_count=1),
    ),
    (
        # It's not possible to chose geometry type here.
        "empty.geojson",
        dict(),
        dict(exception=ValidationError),
    ),
    (
        # An empty layer with MULTIPOINTZ must be created.
        "empty.geojson",
        dict(geometry_type="POINT", is_multi=True, has_z=True),
        dict(geometry_type="MULTIPOINTZ", feature_count=0),
    ),
    (
        # The unclosed ring must be reported as an error.
        "unclosed-ring.geojson",
        dict(),
        dict(exception=ValidationError),
    ),
    (
        # The unclosed ring must be closed in SAFE mode, QGIS does it sielently.
        "unclosed-ring.geojson",
        dict(fix_errors="SAFE"),
        dict(feature_count=1),
    ),
    (
        # Just check loading of POINTZ layers.
        "pointz.geojson",
        dict(geometry_type="POINT"),
        dict(geometry_type="POINTZ", feature_count=1),
    ),
    (
        # Explicit setting of geometry type.
        "pointz.geojson",
        dict(geometry_type="POINT", is_multi=False, has_z=True),
        dict(geometry_type="POINTZ", feature_count=1),
    ),
    (
        # Z coordinate should be stripped here.
        "pointz.geojson",
        dict(geometry_type="POINT", has_z=False, fix_errors="LOSSY"),
        dict(geometry_type="POINT", feature_count=1),
    ),
    (
        # M dimension should cause an error.
        "pointm.vrt",
        dict(),
        dict(exception=ValidationError),
    ),
    (
        # M dimension should be stripped here.
        "pointm.vrt",
        dict(fix_errors="LOSSY"),
        dict(geometry_type="POINT", feature_count=2),
    ),
    (
        "out-of-bounds-point.geojson",
        dict(),
        dict(exception=ValidationError),
    ),
    (
        "out-of-bounds-point.geojson",
        dict(skip_errors=True),
        dict(geometry_type="POINT", feature_count=0),
    ),
    (
        "out-of-bounds-linestring.geojson",
        dict(),
        dict(exception=ValidationError),
    ),
    (
        "out-of-bounds-linestring.geojson",
        dict(skip_errors=True),
        dict(geometry_type="LINESTRING", feature_count=0),
    ),
    (
        "corrupted.zip",
        dict(),
        dict(exception=ValidationError),
    ),
    (
        "corrupted.zip",
        dict(fix_errors="LOSSY"),
        dict(fields=("поле_", "поле__1"), feature_count=1),
    ),
)


@pytest.mark.parametrize("filename, options, checks", CREATE_TEST_PARAMS)
def test_create(filename, options, checks, ngw_txn):
    obj = VectorLayer().persist()

    src = str(path / filename)
    ds = read_dataset(src)
    layer = ds.GetLayer(0)

    geom_cast_params = dict(
        geometry_type=options.get("geometry_type"),
        is_multi=options.get("is_multi"),
        has_z=options.get("has_z"),
    )

    def setup_and_load():
        setup_kwargs = dict()
        load_kwargs = dict()

        if "skip_other_geometry_types" in options:
            setup_kwargs["skip_other_geometry_types"] = options["skip_other_geometry_types"]
            load_kwargs["skip_other_geometry_types"] = options["skip_other_geometry_types"]

        if "fix_errors" in options:
            setup_kwargs["fix_errors"] = options["fix_errors"]
            load_kwargs["fix_errors"] = options["fix_errors"]

        if "skip_errors" in options:
            load_kwargs["skip_errors"] = options["skip_errors"]

        obj.setup_from_ogr(layer, geom_cast_params=geom_cast_params, **setup_kwargs)
        obj.load_from_ogr(layer, **load_kwargs)

    if "exception" in checks:
        with pytest.raises(checks["exception"]):
            setup_and_load()
        DBSession.expunge(obj)
    else:
        setup_and_load()

        DBSession.flush()

        if "geometry_type" in checks:
            exp_geometry_type = checks["geometry_type"]
            assert (
                obj.geometry_type == exp_geometry_type
            ), "Expected geometry type was {} but actually got {}".format(
                exp_geometry_type, obj.geometry_type
            )

        if "feature_count" in checks:
            exp_feature_count = checks["feature_count"]
            query = obj.feature_query()
            feature_count = query().total_count
            assert (
                feature_count == exp_feature_count
            ), "Expected feature count was {} but got {}".format(exp_feature_count, feature_count)

        if "fields" in checks:
            exp_fields = checks["fields"]
            fields = tuple(f.keyname for f in obj.fields)
            assert exp_fields == fields, "Expected layer fields was {} but got {}".format(
                exp_fields, fields
            )
