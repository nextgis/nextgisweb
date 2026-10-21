from pathlib import Path
from tempfile import TemporaryDirectory

import pytest
import transaction
from osgeo import ogr

from nextgisweb.lib.geometry import Geometry
from nextgisweb.lib.ogrhelper import ogr_use_exceptions
from nextgisweb.lib.osrhelper import sr_from_epsg

from nextgisweb.feature_layer import FIELD_TYPE, Feature
from nextgisweb.feature_layer.test import FeatureLayerAPI
from nextgisweb.pyramid.test import WebTestApp
from nextgisweb.resource.test import ResourceAPI

from .. import VectorLayer

pytestmark = pytest.mark.usefixtures("ngw_resource_defaults", "ngw_auth_administrator")


@pytest.fixture
def res_id():
    with transaction.manager:
        res = VectorLayer(geometry_type="MULTIPOINT").persist()
        res.setup_from_fields(
            [
                {"keyname": "int", "datatype": FIELD_TYPE.INTEGER},
                {"keyname": "string", "datatype": FIELD_TYPE.STRING},
            ]
        )
        res.feature_create(
            Feature(
                geom=Geometry.from_wkt("MULTIPOINT ((1 1))"),
                fields={"int": 111, "string": "222"},
            )
        )
    yield res.id


def make_source(fields, wkt, path):
    with ogr_use_exceptions():
        if wkt is None:
            geom = None
            geom_type = ogr.wkbMultiPoint
        else:
            geom = ogr.CreateGeometryFromWkt(wkt)
            geom_type = geom.GetGeometryType()

        ds = ogr.GetDriverByName("GPKG").CreateDataSource(path)
        layer = ds.CreateLayer("add_features", srs=sr_from_epsg(3857), geom_type=geom_type)
        for k, v in fields.items():
            ftype = ogr.OFTInteger if isinstance(v, int) else ogr.OFTString
            layer.CreateField(ogr.FieldDefn(k, ftype))

        feat = ogr.Feature(layer.GetLayerDefn())
        if geom is not None:
            feat.SetGeometry(geom)
        for k, v in fields.items():
            feat.SetField(k, v)
        layer.CreateFeature(feat)


@pytest.mark.parametrize(
    "data",
    (
        pytest.param(
            {"fields": {"int": 1, "string": "two"}, "geom": "MULTIPOINT ((2 2))"},
            id="all",
        ),
        pytest.param({"fields": {"int": 1, "string": "two"}}, id="no-geom"),
        pytest.param({}, id="empty"),
        pytest.param({"fields": {"string": "one", "int": 2}}, id="change-order"),
        pytest.param({"fields": {"int": 1}}, id="lesser-fields"),
        pytest.param({"fields": {"int": 1, "extra": -123}}, id="extra-fields"),
        pytest.param(
            {"fields": {"int": "changed", "string": "same"}, "fields_exp": ("string",)},
            id="change-datatype",
        ),
        pytest.param({"geom": "LINESTRING (0 0,1 1)", "ok": False}, id="geom-invalid"),
        pytest.param({"geom": "POINT (0 0)"}, id="geom-convert"),
        pytest.param(
            {"geom": "GEOMETRYCOLLECTION (POINT (0 0))", "params": {"fix_errors": "SAFE"}},
            id="geom-convert-safe",
        ),
        pytest.param(
            {
                "geom": "GEOMETRYCOLLECTION (POINT (1 1), POINT (2 2))",
                "params": {"fix_errors": "LOSSY"},
            },
            id="geom-convert-lossy",
        ),
    ),
)
def test_add_features(res_id, data, ngw_file_upload, ngw_webtest_app: WebTestApp):
    fields = data.get("fields", {})
    wkt = data.get("geom")
    params = data.get("params", {})
    ok = data.get("ok", True)
    fields_exp = data.get("fields_exp", tuple(fields.keys()))

    fapi = FeatureLayerAPI(res_id)
    features_before = fapi.feature_list()

    with TemporaryDirectory() as tmp_dir:
        tmp_path = Path(tmp_dir) / "add_features.gpkg"
        make_source(fields, wkt, str(tmp_path))
        source = ngw_file_upload(tmp_path)
    rapi = ResourceAPI()
    rapi.update_request(
        res_id,
        {"vector_layer": {"source": source, "keep": True, **params}},
        status=200 if ok else 422,
    )

    if not ok:
        return

    features = fapi.feature_list()
    *features_after, f_new = features

    assert len(features_after) == len(features_before)
    for cmp1, cmp2 in zip(features_after, features_before):
        assert cmp1 == cmp2, "Feature changed"

    fid_exp = features_after[-1]["id"] + 1
    assert f_new["id"] == fid_exp

    if wkt is None:
        assert f_new["geom"] is None
    else:
        geom = ogr.CreateGeometryFromWkt(f_new["geom"])

        geom_exp = ogr.CreateGeometryFromWkt(wkt)
        if ogr.GT_IsSubClassOf(geom_exp.GetGeometryType(), ogr.wkbGeometryCollection) == 1:
            geom_exp = geom_exp.GetGeometryRef(0)
        geom_exp.Set3D(False)
        geom_exp = ogr.ForceToMultiPoint(geom_exp)

        assert geom.Equals(geom_exp)

    for k, v in f_new["fields"].items():
        if k in fields_exp:
            assert v == fields[k]
        else:
            assert v is None

    fid_next = fapi.feature_create({})["id"]
    assert fid_next == f_new["id"] + 1
