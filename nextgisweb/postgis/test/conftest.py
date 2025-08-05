import json

import pytest

FILTER_DATASET = {
    "type": "FeatureCollection",
    "crs": {"type": "name", "properties": {"name": "urn:ogc:def:crs:EPSG::3857"}},
    "features": [
        {
            "type": "Feature",
            "properties": {
                "name": "Alice",
                "age": 25,
                "score": 8.5,
                "city": "NYC",
                "birth_date": "1998-05-15",
                "created_at": "2023-01-10T08:30:00",
                "work_start": "09:00:00",
            },
            "geometry": {"type": "Point", "coordinates": [0, 0]},
        },
        {
            "type": "Feature",
            "properties": {
                "name": "Bob",
                "age": 30,
                "score": 7.0,
                "city": "LA",
                "birth_date": "1993-08-22",
                "created_at": "2023-02-15T14:45:30",
                "work_start": "10:30:00",
            },
            "geometry": {"type": "Point", "coordinates": [1, 1]},
        },
        {
            "type": "Feature",
            "properties": {
                "name": "Charlie",
                "age": 35,
                "score": 9.0,
                "city": "NYC",
                "birth_date": "1988-12-01",
                "created_at": "2023-03-20T16:20:15",
                "work_start": "08:00:00",
            },
            "geometry": {"type": "Point", "coordinates": [2, 2]},
        },
        {
            "type": "Feature",
            "properties": {
                "name": "Diana",
                "age": 28,
                "score": 6.5,
                "city": "SF",
                "birth_date": "1995-03-10",
                "created_at": "2023-01-25T11:15:00",
                "work_start": "09:30:00",
            },
            "geometry": {"type": "Point", "coordinates": [3, 3]},
        },
        {
            "type": "Feature",
            "properties": {
                "name": "Eve",
                "age": 32,
                "score": 8.0,
                "city": "NYC",
                "birth_date": "1991-07-18",
                "created_at": "2023-04-05T10:00:00",
                "work_start": "08:30:00",
            },
            "geometry": {"type": "Point", "coordinates": [4, 4]},
        },
    ],
}


@pytest.fixture(scope="session")
def postgis_filter_geojson():
    return json.loads(json.dumps(FILTER_DATASET))


@pytest.fixture(scope="module")
def postgis_filter_layer_id(ngw_env, postgis_filter_geojson):
    opts_db = ngw_env.core.options.with_prefix("test.database")
    for key in ("host", "name", "user"):
        if key not in opts_db:
            pytest.skip(f"Option test.database.{key} isn't set")

    # Use the helper from postgis.test/__init__.py
    from . import create_feature_layer  # type: ignore

    ogr_dr = "Memory"
    from osgeo import ogr, osr

    driver = ogr.GetDriverByName(ogr_dr)
    datasource = driver.CreateDataSource("")
    srs = osr.SpatialReference()
    srs.ImportFromEPSG(3857)
    layer = datasource.CreateLayer("filter", srs=srs, geom_type=ogr.wkbPoint)

    definition = layer.GetLayerDefn()

    # Create fields
    field_defs = (
        ("name", ogr.OFTString),
        ("age", ogr.OFTInteger),
        ("score", ogr.OFTReal),
        ("city", ogr.OFTString),
        ("birth_date", ogr.OFTDate),
        ("created_at", ogr.OFTDateTime),
        ("work_start", ogr.OFTTime),
    )
    for fname, ftype in field_defs:
        fld = ogr.FieldDefn(fname, ftype)
        layer.CreateField(fld)

    for feature in postgis_filter_geojson["features"]:
        ogr_feat = ogr.Feature(definition)
        geom = ogr.CreateGeometryFromJson(json.dumps(feature["geometry"]))
        ogr_feat.SetGeometry(geom)

        props = feature["properties"]
        ogr_feat.SetField("name", props["name"])
        ogr_feat.SetField("age", props["age"])
        ogr_feat.SetField("score", props["score"])
        ogr_feat.SetField("city", props["city"])
        ogr_feat.SetField("birth_date", props["birth_date"])
        ogr_feat.SetField("created_at", props["created_at"])
        ogr_feat.SetField("work_start", props["work_start"])
        layer.CreateFeature(ogr_feat)

    from nextgisweb.resource import ResourceGroup

    root_group = ResourceGroup.filter_by(parent_id=None).first()
    if root_group is None:
        pytest.skip("Root resource group is not available")

    with create_feature_layer(layer, parent_id=root_group.id) as res:
        yield res.id
