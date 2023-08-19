import json
from string import ascii_letters, printable
from tempfile import NamedTemporaryFile

import pytest
import transaction
from osgeo import gdal

from nextgisweb.env import DBSession
from nextgisweb.lib.geometry import Geometry

from nextgisweb.vector_layer import VectorLayer

from .. import Feature
from ..ogrdriver import EXPORT_FORMAT_OGR

pytestmark = pytest.mark.usefixtures("ngw_resource_defaults", "ngw_auth_administrator")


@pytest.fixture(scope="module")
def layer_id():
    with transaction.manager:
        geojson = {
            "type": "FeatureCollection",
            "features": [
                {
                    "type": "Feature",
                    "properties": {"field": "value"},
                    "geometry": {
                        "type": "Point",
                        "coordinates": [0, 0],
                    },
                },
            ],
        }

        obj = VectorLayer().persist().from_ogr(json.dumps(geojson))
        DBSession.flush()

    yield obj.id


@pytest.fixture()
def update_field(layer_id, ngw_webtest_app):
    def wrapped(**field):
        if "keyname" not in field:
            field["keyname"] = "keyname"
        if "display_name" not in field:
            field["display_name"] = "display_name"

        resp = ngw_webtest_app.get(f"/api/resource/{layer_id}")
        fields = resp.json["feature_layer"]["fields"]
        assert len(fields) == 1

        fields[0].update(field)
        ngw_webtest_app.put_json(
            f"/api/resource/{layer_id}", dict(feature_layer=dict(fields=fields))
        )

    return wrapped


@pytest.fixture()
def export_geojson(layer_id, ngw_webtest_app):
    def wrapped(display_name=False, fid=None, intersects=None, intersects_srs=None):
        qs = dict(
            format="GeoJSON",
            srs="4326",
            zipped="false",
            display_name=str(display_name).lower(),
        )
        if intersects is not None:
            qs["intersects"] = intersects
        if intersects_srs is not None:
            qs["intersects_srs"] = intersects_srs
        if fid is not None:
            qs["fid"] = fid
        resp = ngw_webtest_app.get(f"/api/resource/{layer_id}/export", qs)
        return resp.json

    return wrapped


@pytest.mark.parametrize(
    "value",
    [
        pytest.param(ascii_letters, id="letters"),
        pytest.param(printable, id="printable"),
        pytest.param("юникод", id="unicode"),
        pytest.param("new\nline", id="newline"),
        pytest.param("\r\t\\n", id="escape"),
        pytest.param("'single'", id="single"),
        pytest.param('"single"', id="double"),
        pytest.param("FID", id="fid"),
        pytest.param("COUNT(*)", id="count"),
    ],
)
def test_field_escape(value, update_field, export_geojson):
    update_field(keyname=value)
    geojson = export_geojson(display_name=False)
    fprop = geojson["features"][0]["properties"]
    assert fprop[value] == "value"

    update_field(display_name=value)
    geojson = export_geojson(display_name=True)
    fprop = geojson["features"][0]["properties"]
    assert fprop[value] == "value"

    # to deal with SQL column names that look like SQL keywords
    update_field(keyname=value)
    geojson = export_geojson(display_name=True)
    fprop = geojson["features"][0]["properties"]
    assert fprop["display_name"] == "value"


@pytest.mark.parametrize(
    "intersects, count",
    [
        ("POLYGON((-1 -1, -1 1, 1 1, 1 -1, -1 -1))", 1),
        ("POLYGON((1 1, 1 3, 3 3, 3 1, 1 1))", 0),
    ],
)
def test_intersects(intersects, count, export_geojson):
    geojson = export_geojson(intersects=intersects, intersects_srs=3857)
    assert len(geojson["features"]) == count


@pytest.fixture(scope="function")
def resources():
    some = 3
    params = []

    with transaction.manager:
        for i in range(some):
            layer = VectorLayer(geometry_type="POINT").persist()
            layer.setup_from_fields([])
            DBSession.flush()

            f = Feature()
            f.geom = Geometry.from_wkt(f"POINT ({i} {i})")
            layer.feature_create(f)

            params.append(dict(id=layer.id, name=f"layer_{i}"))

    yield params


@pytest.mark.parametrize(
    "driver_label",
    [
        pytest.param(
            label,
            id=label,
            marks=pytest.mark.skipif(
                driver.display_name
                in (
                    "Storage and eXchange Format (*.sxf)",
                    "MapInfo MIF/MID (*.mif/*.mid)",
                ),
                reason="Not readable",
            ),
        )
        for label, driver in EXPORT_FORMAT_OGR.items()
    ],
)
def test_export_multi(driver_label, resources, ngw_webtest_app):
    driver = EXPORT_FORMAT_OGR[driver_label]
    params = dict(format=driver_label, resources=resources)
    response = ngw_webtest_app.post_json("/api/component/feature_layer/export", params, status=200)

    with NamedTemporaryFile(suffix=".zip") as t:
        t.write(response.body)
        t.flush()

        for param in resources:
            name = param["name"]
            if driver.single_file:
                ogrfn = f"/vsizip/{t.name}/{name}.{driver.extension}"
            else:
                ogrfn = f"/vsizip/{t.name}/{name}/{name}.{driver.extension}"
            ds = gdal.OpenEx(ogrfn, 0)
            assert ds is not None

            layer = ds.GetLayer(0)
            assert layer is not None
            assert layer.GetFeatureCount() == 1
