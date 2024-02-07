from datetime import date, datetime, time
from pathlib import Path

import pytest
import webtest
from osgeo import ogr, osr

from nextgisweb.env import DBSession
from nextgisweb.lib.ogrhelper import read_dataset

from nextgisweb.core.exception import ValidationError
from nextgisweb.feature_layer import FIELD_TYPE

from .. import VectorLayer
from ..table_info import ERROR_LIMIT
from ..util import ERROR_FIX, FID_SOURCE

pytestmark = pytest.mark.usefixtures("ngw_resource_defaults", "ngw_auth_administrator")

DATA_PATH = Path(__file__).parent / "data"


def test_from_fields(ngw_txn):
    res = VectorLayer(geometry_type="POINT")

    res.setup_from_fields(
        [
            dict(keyname="integer", datatype=FIELD_TYPE.INTEGER),
            dict(keyname="bigint", datatype=FIELD_TYPE.BIGINT),
            dict(keyname="real", datatype=FIELD_TYPE.REAL),
            dict(keyname="string", datatype=FIELD_TYPE.STRING, label_field=True),
            dict(keyname="date", datatype=FIELD_TYPE.DATE),
            dict(keyname="time", datatype=FIELD_TYPE.TIME),
            dict(keyname="datetime", datatype=FIELD_TYPE.DATETIME),
        ]
    )

    res.persist()

    assert res.feature_label_field.keyname == "string"

    DBSession.flush()


@pytest.mark.parametrize(
    "filename",
    (
        "shapefile-point-utf8.zip",
        "shapefile-point-win1251.zip",
        "layer.geojson",
    ),
)
def test_from_ogr(filename, ngw_txn):
    res = VectorLayer().persist().from_ogr(DATA_PATH / filename)

    DBSession.flush()

    features = list(res.feature_query()())
    assert len(features) == 1

    feature = features[0]
    assert feature.id == 1

    fields = feature.fields
    assert fields["int"] == -1
    assert fields["date"] == date(2001, 1, 1)
    # TODO: Time and datetime tests fails on shapefile
    # assert fields['time'] == time(23, 59, 59)
    # assert fields['datetime'] == datetime(2001, 1, 1, 23, 59, 0)
    assert fields["string"] == "Foo bar"
    assert (
        fields["unicode"]
        == "Значимость этих проблем настолько очевидна, что реализация намеченных плановых заданий требуют определения и уточнения."
    )


@pytest.mark.parametrize(
    "filename",
    (
        "layer-lon-lat.csv",
        "layer-lon-lat.xlsx",
    ),
)
def test_from_csv_xlsx(filename, ngw_txn):
    dsource = read_dataset(DATA_PATH / filename, source_filename=filename)
    layer = dsource.GetLayer(0)

    res = VectorLayer().persist()

    res.setup_from_ogr(layer)
    res.load_from_ogr(layer)

    DBSession.flush()

    features = list(res.feature_query()())
    assert len(features) == 1

    feature = features[0]
    assert feature.id == 1

    fields = feature.fields
    assert int(fields["int"]) == -1
    assert fields["date"] == "2001/01/01"
    assert fields["time"] == "23:59:59"
    assert fields["datetime"] == "2001/01/01 23:59:00"
    assert fields["string"] == "Foo bar"
    assert (
        fields["unicode"]
        == "Значимость этих проблем настолько очевидна, что реализация намеченных плановых заданий требуют определения и уточнения."
    )


def test_type_geojson(ngw_txn):
    src = DATA_PATH / "type.geojson"

    res = VectorLayer().persist().from_ogr(src)

    DBSession.flush()

    def field_as(f, n, t):
        fidx = f.GetFieldIndex(n)
        if f.IsFieldNull(fidx):
            return None

        attr = getattr(f, "GetFieldAs" + t)
        result = attr(fidx)

        if t in ("Date", "Time", "DateTime"):
            result = [int(v) for v in result]

        return result

    dataset = ogr.Open(str(src))
    layer = dataset.GetLayer(0)

    for feat, ref in zip(res.feature_query()(), layer):
        fields = feat.fields
        assert fields["null"] == field_as(ref, "null", None)
        assert fields["int"] == field_as(ref, "int", "Integer")
        assert fields["int64"] == field_as(ref, "int64", "Integer64")
        assert fields["real"] == field_as(ref, "real", "Double")
        assert fields["date"] == date(*field_as(ref, "date", "DateTime")[0:3])
        assert fields["time"] == time(*field_as(ref, "time", "DateTime")[3:6])
        assert fields["datetime"] == datetime(*field_as(ref, "datetime", "DateTime")[0:6])
        assert fields["string"] == field_as(ref, "string", "String")
        assert fields["unicode"] == field_as(ref, "unicode", "String")


@pytest.mark.parametrize(
    "fid_source, fid_field, id_expect",
    (
        ("SEQUENCE", [], 1),
        ("FIELD", ["int", "not_exists"], -1),
        ("AUTO", ["not_exists", "int"], -1),
        ("AUTO", ["not_exists"], 1),
    ),
)
def test_fid(fid_source, fid_field, id_expect, ngw_txn):
    src = DATA_PATH / "type.geojson"

    dataset = ogr.Open(str(src))
    layer = dataset.GetLayer(0)

    res = VectorLayer().persist()

    res.setup_from_ogr(layer, fid_params=dict(fid_source=fid_source, fid_field=fid_field))
    res.load_from_ogr(layer)

    DBSession.flush()

    query = res.feature_query()
    query.filter_by(id=id_expect)
    assert query().total_count == 1


def test_multi_layers(ngw_webtest_app):
    src = DATA_PATH / "two-layers.zip"
    resp = ngw_webtest_app.post("/api/component/file_upload/", dict(file=webtest.Upload(str(src))))
    upload_meta = resp.json["upload_meta"][0]

    resp = ngw_webtest_app.post_json(
        "/api/component/vector_layer/inspect",
        dict(id=upload_meta["id"]),
        status=200,
    )

    layers = resp.json["layers"]
    assert len(layers) == 2
    assert "layer1" in layers
    assert "layer2" in layers

    resp = ngw_webtest_app.post_json(
        "/api/resource/",
        dict(
            resource=dict(cls="vector_layer", display_name="test two layers", parent=dict(id=0)),
            vector_layer=dict(
                source=upload_meta,
                source_layer="layer1",
                srs=dict(id=3857),
                fid_source="AUTO",
                fid_field="id",
            ),
        ),
        status=201,
    )

    layer_id = resp.json["id"]

    resp = ngw_webtest_app.get("/api/resource/%d/feature/2" % layer_id, status=200)
    feature = resp.json
    assert feature["fields"] == dict(name_point="Point two")

    ngw_webtest_app.delete("/api/resource/%d" % layer_id)


def test_error_limit():
    res = VectorLayer().persist()

    ds = ogr.GetDriverByName("Memory").CreateDataSource("")

    srs = osr.SpatialReference()
    srs.ImportFromEPSG(4326)

    layer = ds.CreateLayer("layer_with_errors", srs=srs, geom_type=ogr.wkbPoint)
    defn = layer.GetLayerDefn()

    some = 3

    for i in range(ERROR_LIMIT + some):
        feature = ogr.Feature(defn)
        if i < ERROR_LIMIT:
            feature.SetGeometry(None)
        else:
            feature.SetGeometry(ogr.CreateGeometryFromWkt("POINT (0 0)"))
        layer.CreateFeature(feature)

    res.setup_from_ogr(layer)

    opts = dict(fix_errors=ERROR_FIX.NONE, skip_other_geometry_types=False)
    with pytest.raises(ValidationError) as excinfo:
        res.load_from_ogr(layer, **opts, skip_errors=False)
    assert excinfo.value.detail is not None

    res.load_from_ogr(layer, **opts, skip_errors=True)

    DBSession.flush()
    assert res.feature_query()().total_count == some


def test_geom_field():
    res = VectorLayer().persist()

    src = DATA_PATH / "geom-fld.geojson"
    ds = ogr.Open(str(src))
    layer = ds.GetLayer(0)

    with pytest.raises(ValidationError):
        res.setup_from_ogr(layer)
    res.setup_from_ogr(layer, fix_errors=ERROR_FIX.SAFE)
    res.load_from_ogr(layer)

    DBSession.flush()

    query = res.feature_query()
    feature = query().one()
    assert feature.id == 1
    assert list(feature.fields.keys()) == ["geom_1"]


@pytest.mark.parametrize(
    "data",
    (
        "int64",
        "id-non-uniq",
        "id-empty",
    ),
)
def test_id_field(data):
    res = VectorLayer().persist()

    src = DATA_PATH / f"{data}.geojson"
    ds = ogr.Open(str(src))
    layer = ds.GetLayer(0)

    fid_params = dict(fid_source=FID_SOURCE.FIELD, fid_field=["id"])
    with pytest.raises(ValidationError):
        res.setup_from_ogr(layer, fid_params=fid_params)
    res.setup_from_ogr(layer, fix_errors=ERROR_FIX.SAFE, fid_params=fid_params)
    res.load_from_ogr(layer)

    DBSession.flush()

    query = res.feature_query()
    feature = query().one()
    assert feature.id == 1
    assert list(feature.fields.keys()) == ["id"]
