import pytest

from nextgisweb.env import DBSession

from nextgisweb.core.exception import ValidationError

from .. import VectorLayer
from ..util import DRIVERS

pytestmark = pytest.mark.usefixtures("ngw_resource_defaults")


# List of creation test cases: file name, creation options, and final checks.
CREATE_TEST_PARAMS = (
    (
        "geom-collection.geojson",
        {},
        {"exception": ValidationError},
    ),
    (
        "geom-collection.geojson",
        {"fix_errors": "SAFE"},
        {"feature_count": 2},
    ),
    (
        "incomplete-linestring.geojson",
        {},
        {"exception": ValidationError},
    ),
    (
        "incomplete-multilinestring.geojson",
        {"fix_errors": "SAFE", "skip_errors": True},
        {"geometry_type": "MULTILINESTRING", "feature_count": 0},
    ),
    (
        "incomplete-multilinestring.geojson",
        {"fix_errors": "LOSSY"},
        {"geometry_type": "MULTILINESTRING", "feature_count": 1},
    ),
    (
        "incomplete-polygon.geojson",
        {},
        {"exception": ValidationError},
    ),
    (
        "incomplete-multipolygon.geojson",
        {"fix_errors": "SAFE", "skip_errors": True},
        {"geometry_type": "MULTIPOLYGON", "feature_count": 0},
    ),
    (
        "incomplete-multipolygon.geojson",
        {"fix_errors": "LOSSY"},
        {"geometry_type": "MULTIPOLYGON", "feature_count": 2},
    ),
    (
        "mixed-feature-geom.geojson",
        {"skip_other_geometry_types": True},
        {"exception": ValidationError},
    ),
    (
        "mixed-feature-geom.geojson",
        {"cast_geometry_type": "POINT", "skip_other_geometry_types": True},
        {"geometry_type": "MULTIPOINT", "feature_count": 2},
    ),
    (
        "empty-ring.geojson",
        {},
        {"exception": ValidationError},
    ),
    (
        "empty-ring.geojson",
        {"fix_errors": "LOSSY"},
        {"feature_count": 1},
    ),
    (
        # The second MULTIPOINT geometry must be converted to a SINGLE geometry.
        # The first POINT should be taken in LOSSY mode.
        "mixed-feature-geom.geojson",
        {
            "cast_geometry_type": "POINT",
            "skip_other_geometry_types": True,
            "fix_errors": "LOSSY",
            "cast_is_multi": False,
        },
        {"geometry_type": "POINT", "feature_count": 2},
    ),
    (
        # The layer has only one LINESTRING geometry and it's valid.
        "mixed-feature-geom.geojson",
        {"cast_geometry_type": "LINESTRING", "skip_other_geometry_types": True},
        {"geometry_type": "LINESTRING", "feature_count": 1},
    ),
    (
        "non-multi-geom.geojson",
        {},
        {"geometry_type": "MULTIPOINT", "feature_count": 2},
    ),
    (
        "null-geom.geojson",
        {"cast_geometry_type": "LINESTRING", "skip_other_geometry_types": True},
        {"geometry_type": "LINESTRING", "feature_count": 1},
    ),
    (
        "null-geom.geojson",
        {},
        {"geometry_type": "POINT", "feature_count": 2},
    ),
    (
        # Geometries with topology errors are accepted.
        "self-intersection.geojson",
        {"fix_errors": None},
        {"feature_count": 1},
    ),
    (
        "single-geom-collection.geojson",
        {"cast_geometry_type": "POINT", "fix_errors": "SAFE"},
        {"geometry_type": "POINT", "feature_count": 1},
    ),
    (
        "single-geom-collection.geojson",
        {"cast_geometry_type": "POINT", "skip_other_geometry_types": True},
        {"geometry_type": "POINT", "feature_count": 0},
    ),
    (
        "single-geom-collection.geojson",
        {"cast_geometry_type": "POINT", "fix_errors": "LOSSSY"},
        {"geometry_type": "POINT", "feature_count": 1},
    ),
    (
        "single-geom-collection.geojson",
        {"cast_geometry_type": "LINESTRING", "fix_errors": "SAFE"},
        {"exception": ValidationError},
    ),
    (
        "single-geom-collection.geojson",
        {"cast_geometry_type": "LINESTRING", "fix_errors": "LOSSY"},
        {"geometry_type": "LINESTRING", "feature_count": 1},
    ),
    (
        # It's not possible to chose geometry type here.
        "empty.geojson",
        {},
        {"exception": ValidationError},
    ),
    (
        # An empty layer with MULTIPOINTZ must be created.
        "empty.geojson",
        {"cast_geometry_type": "POINT", "cast_is_multi": True, "cast_has_z": True},
        {"geometry_type": "MULTIPOINTZ", "feature_count": 0},
    ),
    (
        # The unclosed ring must be reported as an error.
        "unclosed-ring.geojson",
        {},
        {"exception": ValidationError},
    ),
    (
        # The unclosed ring must be closed in SAFE mode, QGIS does it sielently.
        "unclosed-ring.geojson",
        {"fix_errors": "SAFE"},
        {"feature_count": 1},
    ),
    (
        # Just check loading of POINTZ layers.
        "pointz.geojson",
        {"cast_geometry_type": "POINT"},
        {"geometry_type": "POINTZ", "feature_count": 1},
    ),
    (
        # Explicit setting of geometry type.
        "pointz.geojson",
        {"cast_geometry_type": "POINT", "cast_is_multi": False, "cast_has_z": True},
        {"geometry_type": "POINTZ", "feature_count": 1},
    ),
    (
        # Z coordinate should be stripped here.
        "pointz.geojson",
        {"cast_geometry_type": "POINT", "cast_has_z": False, "fix_errors": "LOSSY"},
        {"geometry_type": "POINT", "feature_count": 1},
    ),
    (
        # M dimension should cause an error.
        "pointm.vrt",
        {},
        {"exception": ValidationError},
    ),
    (
        # M dimension should be stripped here.
        "pointm.vrt",
        {"fix_errors": "LOSSY"},
        {"geometry_type": "POINT", "feature_count": 2},
    ),
    (
        "out-of-bounds-point.geojson",
        {},
        {"exception": ValidationError},
    ),
    (
        "out-of-bounds-point.geojson",
        {"skip_errors": True},
        {"geometry_type": "POINT", "feature_count": 0},
    ),
    (
        "out-of-bounds-linestring.geojson",
        {},
        {"exception": ValidationError},
    ),
    (
        "out-of-bounds-linestring.geojson",
        {"skip_errors": True},
        {"geometry_type": "LINESTRING", "feature_count": 0},
    ),
    (
        "corrupted.zip",
        {},
        {"exception": ValidationError},
    ),
    (
        "corrupted.zip",
        {"fix_errors": "LOSSY"},
        {"fields": ("поле_", "поле__1"), "feature_count": 1},
    ),
)


@pytest.mark.parametrize("filename, options, checks", CREATE_TEST_PARAMS)
def test_create(filename, options, checks, ngw_txn, ngw_data_path):
    obj = VectorLayer().persist()
    src = ngw_data_path / "errors" / filename
    options["allowed_drivers"] = DRIVERS.enum + ("OGR_VRT",)

    if "exception" in checks:
        with pytest.raises(checks["exception"]):
            obj.from_source(src, **options)
        DBSession.expunge(obj)
    else:
        obj.from_source(src, **options)

        if "geometry_type" in checks:
            exp_geometry_type = checks["geometry_type"]
            assert obj.geometry_type == exp_geometry_type, (
                "Expected geometry type was {} but actually got {}".format(
                    exp_geometry_type, obj.geometry_type
                )
            )

        if "feature_count" in checks:
            exp_feature_count = checks["feature_count"]
            query = obj.feature_query()
            feature_count = query().total_count
            assert feature_count == exp_feature_count, (
                "Expected feature count was {} but got {}".format(exp_feature_count, feature_count)
            )

        if "fields" in checks:
            exp_fields = checks["fields"]
            fields = tuple(f.keyname for f in obj.fields)
            assert exp_fields == fields, "Expected layer fields was {} but got {}".format(
                exp_fields, fields
            )
