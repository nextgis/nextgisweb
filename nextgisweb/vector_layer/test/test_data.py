from datetime import date, datetime, time
from unittest.mock import ANY

import pytest
from osgeo import ogr, osr

from nextgisweb.core.exception import ValidationError
from nextgisweb.feature_layer import FIELD_TYPE
from nextgisweb.feature_layer.test import FeatureLayerAPI, parametrize_versioning

from .. import VectorLayer
from ..ogrloader import ERROR_LIMIT, FID_SOURCE, FIX_ERRORS

pytestmark = pytest.mark.usefixtures("ngw_resource_defaults", "ngw_auth_administrator")


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


@pytest.mark.parametrize(
    "filename",
    (
        "shapefile-point-utf8.zip",
        "shapefile-point-win1251.zip",
        "layer.geojson",
    ),
)
def test_from_ogr(filename, ngw_txn, ngw_data_path):
    res = VectorLayer().persist().from_ogr(ngw_data_path / filename)
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
def test_from_csv_xlsx(filename, ngw_txn, ngw_data_path):
    res = VectorLayer().persist()
    res.from_source(ngw_data_path / filename, source_filename=filename)

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


def test_type_geojson(ngw_txn, ngw_data_path):
    src = ngw_data_path / "type.geojson"
    res = VectorLayer().persist().from_ogr(src)

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
def test_fid(fid_source, fid_field, id_expect, ngw_txn, ngw_data_path):
    res = (
        VectorLayer()
        .persist()
        .from_source(
            ngw_data_path / "type.geojson",
            fid_source=fid_source,
            fid_field=fid_field,
        )
    )

    query = res.feature_query()
    query.filter_by(id=id_expect)
    assert query().total_count == 1


def test_source_layer(ngw_webtest_app, ngw_resource_group_sub, ngw_file_upload, ngw_data_path):
    upload_meta = ngw_file_upload(ngw_data_path / "two-layers.zip")

    resp = ngw_webtest_app.post_json(
        "/api/component/vector_layer/inspect",
        dict(id=upload_meta["id"]),
        status=200,
    )

    layers = resp.json["layers"]
    assert layers == ["layer1", "layer2"]

    resp = ngw_webtest_app.post_json(
        "/api/resource/",
        dict(
            resource=dict(
                cls="vector_layer",
                display_name="test two layers",
                parent=dict(id=ngw_resource_group_sub),
            ),
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

    layer_url = f"/api/resource/{resp.json['id']}"
    second = ngw_webtest_app.get(f"{layer_url}/feature/2", status=200).json
    assert second["fields"] == dict(name_point="Point two")

    resp = ngw_webtest_app.put_json(
        layer_url,
        dict(vector_layer=dict(delete_all_features=True)),
        status=200,
    )

    ngw_webtest_app.get(f"{layer_url}/feature/2", status=404)


@parametrize_versioning()
def test_copy(versioning, ngw_webtest_app, ngw_resource_group_sub, ngw_file_upload, ngw_data_path):
    upload_meta = ngw_file_upload(ngw_data_path / "layer.geojson")
    extensions = ["attachment", "description"]

    source = ngw_webtest_app.post_json(
        "/api/resource/",
        dict(
            resource=dict(
                cls="vector_layer",
                display_name="Source",
                parent=dict(id=ngw_resource_group_sub),
            ),
            feature_layer=dict(
                versioning=dict(enabled=versioning),
            ),
            vector_layer=dict(
                srs=dict(id=3857),
                source=upload_meta,
            ),
        ),
        status=201,
    ).json

    source_fapi = FeatureLayerAPI(ngw_webtest_app, source["id"], extensions=extensions)

    def _expected():
        result = []
        for i in source_fapi.feature_list():
            if versioning:
                i["vid"] = 1
            if isinstance(i["extensions"]["attachment"], list):
                for a in i["extensions"]["attachment"]:
                    a.update(id=ANY, file_meta=ANY)
            result.append(i)
        return result

    expected_v1 = _expected()

    source_fapi.feature_update(
        1,
        dict(
            extensions=dict(
                attachment=[dict(file_upload=upload_meta)],
                description="Example description",
            )
        ),
    )

    feature = source_fapi.feature_get(1)
    extensions = feature["extensions"]

    assert extensions["attachment"][0]["name"] == "layer.geojson"
    assert extensions["description"] == "Example description"

    expected_v2 = _expected()

    dest = ngw_webtest_app.post_json(
        "/api/resource/",
        dict(
            resource=dict(
                cls="vector_layer",
                display_name="Latest",
                parent=dict(id=ngw_resource_group_sub),
            ),
            feature_layer=dict(
                versioning=dict(enabled=versioning),
            ),
            vector_layer=dict(
                srs=dict(id=3857),
                feature_layer=dict(resource=source),
            ),
        ),
        status=201,
    ).json

    dest_fapi = FeatureLayerAPI(ngw_webtest_app, dest["id"], extensions=extensions)
    assert dest_fapi.feature_list() == expected_v2

    resp = dest_fapi.feature_create(dict())
    assert resp["id"] == 2

    if not versioning:
        return

    for version, expected in ((1, expected_v1), (2, expected_v2)):
        dest = ngw_webtest_app.post_json(
            "/api/resource/",
            dict(
                resource=dict(
                    cls="vector_layer",
                    display_name=f"Version {version}",
                    parent=dict(id=ngw_resource_group_sub),
                ),
                feature_layer=dict(
                    versioning=dict(enabled=versioning),
                ),
                vector_layer=dict(
                    srs=dict(id=3857),
                    feature_layer=dict(resource=source, version=version),
                ),
            ),
            status=201,
        ).json

        dest_fapi = FeatureLayerAPI(ngw_webtest_app, dest["id"], extensions=extensions)
        assert dest_fapi.feature_list() == expected


def test_geometry_type_change(
    ngw_webtest_app,
    ngw_resource_group_sub,
    ngw_file_upload,
    ngw_data_path,
):
    upload_meta = ngw_file_upload(ngw_data_path / "pointz.geojson")

    resp = ngw_webtest_app.post_json(
        "/api/resource/",
        dict(
            resource=dict(
                cls="vector_layer",
                display_name="test_geometry_type_change",
                parent=dict(id=ngw_resource_group_sub),
            ),
            vector_layer=dict(
                source=upload_meta,
                srs=dict(id=3857),
            ),
        ),
        status=201,
    )

    url = f"/api/resource/{resp.json['id']}"
    assert ngw_webtest_app.get(url).json["vector_layer"]["geometry_type"] == "POINTZ"
    ngw_webtest_app.put_json(url, dict(vector_layer=dict(geometry_type="LINESTRINGZ")), status=422)
    ngw_webtest_app.put_json(url, dict(vector_layer=dict(geometry_type="MULTIPOINT")), status=200)


def test_replace_file(ngw_webtest_app, ngw_resource_group_sub, ngw_file_upload, ngw_data_path):
    pointz_geojson = ngw_file_upload(ngw_data_path / "pointz.geojson")
    type_geojson = ngw_file_upload(ngw_data_path / "type.geojson")

    resp = ngw_webtest_app.post_json(
        "/api/resource/",
        dict(
            resource=dict(
                cls="vector_layer",
                display_name="test_replace_file",
                parent=dict(id=ngw_resource_group_sub),
            ),
            vector_layer=dict(
                source=pointz_geojson,
                srs=dict(id=3857),
            ),
        ),
        status=201,
    )

    url = f"/api/resource/{resp.json['id']}"
    ngw_webtest_app.put_json(url, dict(vector_layer=dict(source=type_geojson)))
    assert ngw_webtest_app.get(url).json["vector_layer"]["geometry_type"] == "POINT"


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
        wkt = "POINTM (0 0 0)" if i < ERROR_LIMIT else "POINT (0 0)"
        feature.SetGeometry(ogr.CreateGeometryFromWkt(wkt))
        layer.CreateFeature(feature)

    opts = dict(fix_errors=FIX_ERRORS.NONE)
    with pytest.raises(ValidationError) as excinfo:
        res.from_source(layer, **opts, skip_errors=False)
    assert excinfo.value.detail is not None

    res.from_source(layer, **opts, skip_errors=True)

    assert res.feature_query()().total_count == some


def test_geom_field(ngw_data_path):
    res = VectorLayer().persist()
    src = ngw_data_path / "geom-fld.geojson"
    res.from_source(src)

    query = res.feature_query()
    feature = query().one()
    assert feature.id == 1
    assert list(feature.fields.keys()) == ["geom"]


@pytest.mark.parametrize(
    "data",
    (
        "int64",
        "id-non-uniq",
        "id-empty",
    ),
)
def test_id_field(data, ngw_data_path):
    res = VectorLayer().persist()
    src = ngw_data_path / f"{data}.geojson"

    fid_params = dict(fid_source=FID_SOURCE.FIELD, fid_field=["id"])
    with pytest.raises(ValidationError):
        res.from_source(src, **fid_params)

    res.from_source(src, fix_errors=FIX_ERRORS.SAFE, **fid_params)

    query = res.feature_query()
    feature = query().one()
    assert feature.id == 1
    assert list(feature.fields.keys()) == ["id"]
